"""Shift & Attendance module dashboard (workspace "Shift & Attendance", dashboard "Attendance")."""

import frappe
from frappe import _
from frappe.utils import add_days, get_datetime, getdate

from iisc_theme.module_dashboards import common as c

PRESENT = ("Present", "Work From Home", "Half Day")


@frappe.whitelist()
def get_dashboard(months=6):
	months = c.months_arg(months)
	now = c.now_date()
	if c.use_demo():
		return _demo(now, months)

	active = frappe.db.count("Employee", {"status": "Active"})
	today = c.rows("Attendance", {"docstatus": 1, "attendance_date": now}, ["status", "late_entry", "early_exit"])
	today_count = c.group_count(today, "status")
	present = sum(today_count.get(s, 0) for s in PRESENT)

	since = add_days(now, -13)
	att14 = c.rows("Attendance", {"docstatus": 1, "attendance_date": ["between", [since, now]]}, ["attendance_date", "status", "late_entry"])
	days = [add_days(since, i) for i in range(14)]
	idx = {str(d): i for i, d in enumerate(days)}
	p14, l14, a14, late14 = [0] * 14, [0] * 14, [0] * 14, [0] * 14
	for r in att14 or []:
		i = idx.get(str(r.attendance_date))
		if i is None:
			continue
		if r.status in PRESENT:
			p14[i] += 1
		elif r.status == "On Leave":
			l14[i] += 1
		elif r.status == "Absent":
			a14[i] += 1
		if r.late_entry:
			late14[i] += 1

	starts = c.month_starts(now, months)
	attm = c.rows("Attendance", {"docstatus": 1, "attendance_date": c.window(starts)}, ["attendance_date", "status"])
	rate = None
	if attm is not None:
		tot, pres = [0] * months, [0] * months
		for r in attm:
			i = c.bucket(starts, r.attendance_date)
			if i is None:
				continue
			tot[i] += 1
			if r.status in PRESENT:
				pres[i] += 1
		rate = {
			"labels": c.month_labels(starts),
			"datasets": [{"name": _("Attendance %"), "values": [round(p * 100.0 / t, 1) if t else 0 for p, t in zip(pres, tot)]}],
		}

	shifts = c.rows("Shift Assignment", {"docstatus": 1, "status": "Active", "start_date": ["<=", now]}, ["shift_type", "end_date"])
	shifts = [s for s in shifts or [] if not s.end_date or getdate(s.end_date) >= now] if shifts is not None else None

	checkins = c.rows(
		"Employee Checkin",
		{"time": ["between", [f"{now} 00:00:00", f"{now} 23:59:59"]]},
		["name", "employee_name", "log_type", "time"],
		order_by="time desc",
		limit=6,
	)
	pending = []
	for dt, filters, extra, tone in (
		("Attendance Request", {"docstatus": 0}, ["reason", "from_date", "to_date"], "c-blue"),
		("Shift Request", {"docstatus": 0, "status": "Draft"}, ["shift_type", "from_date", "to_date"], "c-navy"),
	):
		for r in c.rows(dt, filters, ["name", "employee_name", "department", "creation", *extra], limit=5) or []:
			pending.append(
				{
					"doctype": dt,
					"name": r.name,
					"employee_name": r.employee_name,
					"department": c.short(r.department),
					"type": _("Attendance Regularization") if dt == "Attendance Request" else (r.shift_type or _("Shift Request")),
					"details": f"{_(r.reason) if dt == 'Attendance Request' and r.reason else ''} {frappe.format(r.from_date, 'Date')} – {frappe.format(r.to_date, 'Date')}".strip(),
					"creation": str(r.creation),
					"tone": tone,
				}
			)
	pending.sort(key=lambda x: x["creation"], reverse=True)
	pending_total = (c.count("Attendance Request", {"docstatus": 0}) or 0) + (c.count("Shift Request", {"docstatus": 0, "status": "Draft"}) or 0)

	return {
		"demo": False,
		"kpis": {
			"present": present,
			"present_pct": round(present * 100.0 / active, 1) if active else None,
			"absent": today_count.get("Absent", 0),
			"on_leave": today_count.get("On Leave", 0),
			"late": sum(1 for r in today or [] if r.late_entry),
			"early": sum(1 for r in today or [] if r.early_exit),
			"unmarked": max(active - len(today or []), 0) if today is not None else None,
			"pending": pending_total,
			"checkins_today": c.count("Employee Checkin", {"time": ["between", [f"{now} 00:00:00", f"{now} 23:59:59"]]}),
		},
		"charts": {
			"trend": {
				"labels": [d.strftime("%d %b") for d in days],
				"datasets": [
					{"name": _("Present"), "values": p14},
					{"name": _("On Leave"), "values": l14},
					{"name": _("Absent"), "values": a14},
				],
			}
			if att14 is not None
			else None,
			"today": {"labels": list(today_count.keys()), "values": list(today_count.values())} if today else None,
			"rate": rate,
			"late": {"labels": [d.strftime("%d %b") for d in days], "datasets": [{"name": _("Late entries"), "values": late14}]},
			"shifts": c.top(c.group_count(shifts, "shift_type", _("Not Set")), 6) if shifts is not None else None,
		},
		"checkins": [
			{"doctype": "Employee Checkin", "name": r.name, "title": r.employee_name, "sub": get_datetime(r.time).strftime("%I:%M %p"), "chip": _(r.log_type or "—"), "chipTone": "c-teal" if r.log_type == "IN" else "c-gray"}
			for r in checkins or []
		],
		"pending": pending[:6],
		"pending_total": pending_total,
	}


def _demo(now, months):
	starts = c.month_starts(now, months)
	days = [add_days(now, -13 + i) for i in range(14)]

	def wd(vals):
		return [0 if d.weekday() == 6 else vals[i % len(vals)] for i, d in enumerate(days)]

	return {
		"demo": True,
		"kpis": {"present": 212, "present_pct": 85.5, "absent": 8, "on_leave": 14, "late": 11, "early": 4, "unmarked": 14, "pending": 5, "checkins_today": 198},
		"charts": {
			"trend": {
				"labels": [d.strftime("%d %b") for d in days],
				"datasets": [
					{"name": "Present", "values": wd([212, 215, 209, 214, 211, 216, 213])},
					{"name": "On Leave", "values": wd([14, 11, 15, 12, 13, 9, 12])},
					{"name": "Absent", "values": wd([6, 4, 7, 5, 6, 3, 5])},
				],
			},
			"today": {"labels": ["Present", "Work From Home", "On Leave", "Absent", "Half Day"], "values": [190, 16, 14, 8, 6]},
			"rate": {"labels": c.month_labels(starts), "datasets": [{"name": "Attendance %", "values": c.cyc([91.2, 92.5, 90.1, 93.4, 92.8, 91.7, 89.9, 92.2, 93.1, 90.8, 92.6, 93.0], months)}]},
			"late": {"labels": [d.strftime("%d %b") for d in days], "datasets": [{"name": "Late entries", "values": wd([9, 12, 8, 14, 10, 7, 11])}]},
			"shifts": {"labels": ["General (9:00–5:30)", "Morning (6:00–2:00)", "Evening (2:00–10:00)", "Night (10:00–6:00)", "Lab Flexi"], "values": [168, 28, 22, 12, 18]},
		},
		"checkins": [
			{"doctype": "Employee Checkin", "name": None, "title": "Dr. Meera Nair", "sub": "08:52 AM • Main Gate", "chip": "IN", "chipTone": "c-teal"},
			{"doctype": "Employee Checkin", "name": None, "title": "Suresh Babu", "sub": "08:47 AM • Admin Block", "chip": "IN", "chipTone": "c-teal"},
			{"doctype": "Employee Checkin", "name": None, "title": "Rajesh Menon", "sub": "06:58 AM • SERC", "chip": "OUT", "chipTone": "c-gray"},
			{"doctype": "Employee Checkin", "name": None, "title": "Ananya Rao", "sub": "08:31 AM • Biochemistry", "chip": "IN", "chipTone": "c-teal"},
		],
		"pending": [
			{"doctype": "Attendance Request", "name": None, "employee_name": "Kavya Iyer", "department": "Physics", "type": "Attendance Regularization", "details": "On Duty – field work (yesterday)", "creation": f"{now} 09:40:00", "tone": "c-blue"},
			{"doctype": "Shift Request", "name": None, "employee_name": "Rajesh Menon", "department": "SERC", "type": "Night → General", "details": "Next week", "creation": f"{add_days(now, -1)} 17:10:00", "tone": "c-navy"},
			{"doctype": "Attendance Request", "name": None, "employee_name": "Arjun Menon", "department": "Aerospace Engineering", "type": "Attendance Regularization", "details": "Work From Home (Monday)", "creation": f"{add_days(now, -2)} 11:05:00", "tone": "c-blue"},
		],
		"pending_total": 5,
	}
