"""HR Setup module dashboard (workspace "HR Setup", dashboard "Human Resource")."""

import frappe
from frappe import _
from frappe.utils import add_days, date_diff, getdate

from iisc_theme.module_dashboards import common as c

TENURE_BANDS = [(0, 1, "< 1 yr"), (1, 3, "1–3 yrs"), (3, 5, "3–5 yrs"), (5, 10, "5–10 yrs"), (10, 99, "10+ yrs")]


@frappe.whitelist()
def get_dashboard(months=6):
	months = c.months_arg(months)
	now = c.now_date()
	if c.use_demo():
		return _demo(now, months)

	starts = c.month_starts(now, months)
	y_start, y_end = c.year_bounds(now)
	active = c.rows("Employee", {"status": "Active"}, ["department", "employment_type", "gender", "date_of_joining", "designation", "branch"]) or []
	joined = c.rows("Employee", {"date_of_joining": c.window(starts)}, ["date_of_joining"])
	left = c.rows("Employee", {"relieving_date": c.window(starts)}, ["relieving_date"])
	exits_year = c.count("Employee", {"relieving_date": ["between", [y_start, y_end]]})
	headcount = len(active)

	tenure = {label: 0 for _a, _b, label in TENURE_BANDS}
	for e in active:
		if not e.date_of_joining:
			continue
		years = date_diff(now, e.date_of_joining) / 365.25
		for lo, hi, label in TENURE_BANDS:
			if lo <= years < hi:
				tenure[label] += 1
				break

	recent = c.rows(
		"Employee",
		{"status": "Active", "date_of_joining": [">=", add_days(now, -60)]},
		["name", "employee_name", "designation", "department", "date_of_joining"],
		order_by="date_of_joining desc",
		limit=6,
	)
	return {
		"demo": False,
		"kpis": {
			"headcount": headcount,
			"joined_month": c.count("Employee", {"date_of_joining": ["between", [starts[-1], now]]}),
			"departments": len({e.department for e in active if e.department}),
			"designations": len({e.designation for e in active if e.designation}),
			"exits_year": exits_year,
			"attrition": round(exits_year * 100.0 / (headcount + (exits_year or 0)), 1) if headcount else None,
		},
		"charts": {
			"departments": c.top({c.short(k) or _("Unassigned"): v for k, v in c.group_count(active, "department").items()}, 8),
			"workforce": c.top(c.group_count(active, "employment_type", _("Not Set")), 6),
			"gender": c.top(c.group_count(active, "gender", _("Not Set")), 4),
			"tenure": {"labels": list(tenure.keys()), "values": list(tenure.values())},
			"movement": {
				"labels": c.month_labels(starts),
				"datasets": [
					{"name": _("Joined"), "values": c.monthly(joined, starts, "date_of_joining")},
					{"name": _("Relieved"), "values": c.monthly(left, starts, "relieving_date")},
				],
			}
			if joined is not None and left is not None
			else None,
		},
		"recent": [
			{
				"doctype": "Employee",
				"name": r.name,
				"title": r.employee_name,
				"sub": " • ".join(x for x in [r.designation, c.short(r.department)] if x),
				"chip": getdate(r.date_of_joining).strftime("%d %b"),
				"chipTone": "c-teal",
			}
			for r in recent or []
		],
	}


def _demo(now, months):
	starts = c.month_starts(now, months)
	return {
		"demo": True,
		"kpis": {"headcount": 248, "joined_month": 6, "departments": 14, "designations": 32, "exits_year": 17, "attrition": 6.4},
		"charts": {
			"departments": {
				"labels": ["Physics", "Aerospace Engineering", "Computational & Data Sciences", "Biochemistry", "Civil Engineering", "Administration", "J.R.D. Tata Library", "Others"],
				"values": [42, 36, 30, 28, 24, 40, 12, 36],
			},
			"workforce": {"labels": ["Full-time", "Contract", "Probation", "Intern", "Part-time"], "values": [180, 34, 14, 12, 8]},
			"gender": {"labels": ["Male", "Female", "Other"], "values": [150, 94, 4]},
			"tenure": {"labels": [b[2] for b in TENURE_BANDS], "values": [28, 54, 46, 62, 58]},
			"movement": {
				"labels": c.month_labels(starts),
				"datasets": [
					{"name": "Joined", "values": c.cyc([4, 6, 3, 8, 5, 6, 2, 7, 4, 5, 9, 3], months)},
					{"name": "Relieved", "values": c.cyc([2, 1, 3, 2, 4, 2, 1, 3, 2, 2, 1, 3], months)},
				],
			},
		},
		"recent": [
			{"doctype": "Employee", "name": None, "title": "Dr. Kavya Iyer", "sub": "Assistant Professor • Physics", "chip": add_days(now, -3).strftime("%d %b"), "chipTone": "c-teal"},
			{"doctype": "Employee", "name": None, "title": "Rahul Deshpande", "sub": "Project Associate • CDS", "chip": add_days(now, -8).strftime("%d %b"), "chipTone": "c-teal"},
			{"doctype": "Employee", "name": None, "title": "Fathima Begum", "sub": "Section Officer • Administration", "chip": add_days(now, -15).strftime("%d %b"), "chipTone": "c-teal"},
			{"doctype": "Employee", "name": None, "title": "Arjun Menon", "sub": "Research Engineer • Aerospace", "chip": add_days(now, -22).strftime("%d %b"), "chipTone": "c-teal"},
		],
	}
