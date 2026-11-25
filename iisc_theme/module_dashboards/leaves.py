"""Leaves module dashboard (replaces the Leaves workspace body)."""

from collections import defaultdict

import frappe
from frappe import _
from frappe.utils import add_days, date_diff, flt, get_last_day

from iisc_theme.module_dashboards import common as c


@frappe.whitelist()
def get_dashboard(months=6):
	months = c.months_arg(months)
	now = c.now_date()
	if c.use_demo():
		return _demo(now, months)

	y_start, y_end = c.year_bounds(now)
	year = {"from_date": ["between", [y_start, y_end]], "docstatus": ["!=", 2]}
	LA = "Leave Application"

	kpis = {
		"apps": {
			"total": c.count(LA, year),
			"open": c.count(LA, {**year, "status": "Open"}),
			"approved": c.count(LA, {**year, "status": "Approved"}),
			"rejected": c.count(LA, {**year, "status": "Rejected"}),
		},
		"on_leave_today": c.count(LA, {"status": "Approved", "docstatus": 1, "from_date": ["<=", now], "to_date": [">=", now]}),
		"pending": c.count(LA, {"status": "Open", "docstatus": 0}),
		"upcoming_week": c.count(
			LA, {"status": "Approved", "docstatus": 1, "from_date": ["between", [add_days(now, 1), add_days(now, 7)]]}
		),
	}

	# days taken vs allocated (this year), per leave type
	taken = c.rows(LA, {"status": "Approved", "docstatus": 1, "from_date": ["between", [y_start, y_end]]}, ["leave_type", "total_leave_days"])
	alloc = c.rows(
		"Leave Allocation",
		{"docstatus": 1, "from_date": ["<=", y_end], "to_date": [">=", y_start]},
		["leave_type", "total_leaves_allocated"],
	)
	used_by_type, alloc_by_type = defaultdict(float), defaultdict(float)
	for r in taken or []:
		used_by_type[r.leave_type or _("Other")] += flt(r.total_leave_days)
	for r in alloc or []:
		alloc_by_type[r.leave_type or _("Other")] += flt(r.total_leaves_allocated)
	days_taken, days_alloc = sum(used_by_type.values()), sum(alloc_by_type.values())
	kpis["days"] = {
		"taken": round(days_taken, 1) if taken is not None else None,
		"allocated": round(days_alloc, 1) if alloc is not None else None,
		"utilisation": round(days_taken * 100 / days_alloc, 1) if days_alloc else None,
	}

	# monthly applications by status
	starts = c.month_starts(now, months)
	labels = c.month_labels(starts)
	monthly = None
	apps = c.rows(LA, {"docstatus": ["!=", 2], "from_date": ["between", [starts[0], get_last_day(starts[-1])]]}, ["from_date", "status"])
	if apps is not None:
		series = {"Approved": [0] * months, "Open": [0] * months, "Rejected": [0] * months}
		for r in apps:
			i = c.bucket(starts, r.from_date)
			if i is not None and r.status in series:
				series[r.status][i] += 1
		monthly = {
			"labels": labels,
			"datasets": [{"name": _(k), "values": v} for k, v in series.items()],
		}

	types = sorted(set(used_by_type) | set(alloc_by_type), key=lambda t: -(alloc_by_type[t] or used_by_type[t]))[:7]
	charts = {
		"monthly": monthly,
		"by_type": {
			"labels": list(used_by_type.keys()),
			"values": [round(v, 1) for v in used_by_type.values()],
		}
		if taken is not None
		else None,
		"alloc_vs_used": {
			"labels": types,
			"datasets": [
				{"name": _("Allocated"), "values": [round(alloc_by_type[t], 1) for t in types]},
				{"name": _("Used"), "values": [round(used_by_type[t], 1) for t in types]},
			],
		}
		if types
		else None,
	}

	# who is on leave this week
	on_leave = c.rows(
		LA,
		{"status": "Approved", "docstatus": 1, "from_date": ["<=", add_days(now, 6)], "to_date": [">=", now]},
		["name", "employee", "employee_name", "department", "leave_type", "from_date", "to_date", "total_leave_days"],
		order_by="from_date asc",
		limit=8,
	)
	pending = c.rows(
		LA,
		{"status": "Open", "docstatus": 0},
		["name", "employee", "employee_name", "department", "leave_type", "from_date", "to_date", "total_leave_days", "creation"],
		limit=6,
	)

	return {
		"demo": False,
		"kpis": kpis,
		"charts": charts,
		"on_leave": [_away(r, now) for r in on_leave or []],
		"pending": [_pending(r) for r in pending or []],
		"pending_total": kpis["pending"] or 0,
	}


def _away(r, now):
	return {
		"name": r.name,
		"employee": r.employee,
		"employee_name": r.employee_name or r.employee,
		"department": c.short(r.department),
		"leave_type": r.leave_type,
		"from_date": str(r.from_date),
		"to_date": str(r.to_date),
		"days": flt(r.total_leave_days),
		"back_in": max(date_diff(r.to_date, now) + 1, 0),
	}


def _pending(r):
	return {
		"doctype": "Leave Application",
		"name": r.name,
		"employee_name": r.employee_name or r.employee,
		"department": c.short(r.department),
		"type": r.leave_type,
		"details": f"{frappe.format(r.from_date, 'Date')} – {frappe.format(r.to_date, 'Date')} ({flt(r.total_leave_days):g} {_('days')})",
		"creation": str(r.creation),
	}


def _demo(now, months):
	starts = c.month_starts(now, months)

	def cyc(v):
		return [v[i % len(v)] for i in range(months)]

	def d(n):
		return str(add_days(now, n))

	return {
		"demo": True,
		"kpis": {
			"apps": {"total": 132, "open": 9, "approved": 110, "rejected": 13},
			"on_leave_today": 14,
			"pending": 9,
			"upcoming_week": 21,
			"days": {"taken": 424, "allocated": 1860, "utilisation": 22.8},
		},
		"charts": {
			"monthly": {
				"labels": c.month_labels(starts),
				"datasets": [
					{"name": "Approved", "values": cyc([16, 19, 13, 21, 24, 20, 17, 22, 15, 19, 23, 18])},
					{"name": "Open", "values": cyc([1, 2, 1, 2, 3, 4, 1, 2, 2, 1, 3, 2])},
					{"name": "Rejected", "values": cyc([1, 1, 2, 2, 1, 1, 2, 1, 1, 2, 1, 1])},
				],
			},
			"by_type": {
				"labels": ["Privilege Leave", "Casual Leave", "Sick Leave", "Compensatory Off", "Leave Without Pay"],
				"values": [210, 120, 64, 22, 8],
			},
			"alloc_vs_used": {
				"labels": ["Privilege Leave", "Casual Leave", "Sick Leave", "Compensatory Off"],
				"datasets": [
					{"name": "Allocated", "values": [744, 496, 496, 124]},
					{"name": "Used", "values": [210, 120, 64, 22]},
				],
			},
		},
		"on_leave": [
			{"name": None, "employee": None, "employee_name": "Dr. Meera Nair", "department": "Physics", "leave_type": "Privilege Leave", "from_date": d(-2), "to_date": d(2), "days": 5, "back_in": 3},
			{"name": None, "employee": None, "employee_name": "Suresh Babu", "department": "Administration", "leave_type": "Sick Leave", "from_date": d(0), "to_date": d(1), "days": 2, "back_in": 2},
			{"name": None, "employee": None, "employee_name": "Ananya Rao", "department": "Biochemistry", "leave_type": "Casual Leave", "from_date": d(0), "to_date": d(0), "days": 1, "back_in": 1},
			{"name": None, "employee": None, "employee_name": "Vikram Shetty", "department": "Aerospace Engineering", "leave_type": "Privilege Leave", "from_date": d(3), "to_date": d(9), "days": 7, "back_in": 10},
		],
		"pending": [
			{"doctype": "Leave Application", "name": None, "employee_name": "Dr. Aravind Kumar", "department": "Aerospace Engineering", "type": "Casual Leave", "details": "3 days, from next Monday", "creation": f"{now} 10:15:00"},
			{"doctype": "Leave Application", "name": None, "employee_name": "Mohammed Faisal", "department": "J.R.D. Tata Library", "type": "Privilege Leave", "details": "5 days, next month", "creation": f"{add_days(now, -1)} 16:40:00"},
			{"doctype": "Leave Application", "name": None, "employee_name": "Kavya Iyer", "department": "Physics", "type": "Sick Leave", "details": "1 day (yesterday)", "creation": f"{add_days(now, -2)} 09:05:00"},
		],
		"pending_total": 9,
	}
