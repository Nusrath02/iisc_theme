"""Tenure (employee lifecycle) module dashboard (workspace "Tenure", dashboard "Employee Lifecycle")."""

import frappe
from frappe import _
from frappe.utils import add_days, date_diff

from iisc_theme.module_dashboards import common as c

BANDS = [(0, 1, "< 1 yr"), (1, 3, "1–3 yrs"), (3, 5, "3–5 yrs"), (5, 10, "5–10 yrs"), (10, 99, "10+ yrs")]


@frappe.whitelist()
def get_dashboard(months=6):
	months = c.months_arg(months)
	now = c.now_date()
	if c.use_demo():
		return _demo(now, months)

	starts = c.month_starts(now, months)
	y_start, y_end = c.year_bounds(now)
	open_f = {"boarding_status": ["in", ["Pending", "In Process"]], "docstatus": ["!=", 2]}
	onb = c.rows("Employee Onboarding", open_f, ["name", "employee_name", "department", "boarding_status", "date_of_joining", "boarding_begins_on"], limit=6)
	sep = c.rows("Employee Separation", open_f, ["name", "employee_name", "department", "boarding_status", "resignation_letter_date", "boarding_begins_on"], limit=6)
	promos = c.rows("Employee Promotion", {"docstatus": 1, "promotion_date": c.window(starts)}, ["promotion_date"])
	transfers = c.rows("Employee Transfer", {"docstatus": 1, "transfer_date": c.window(starts)}, ["transfer_date"])
	joined = c.rows("Employee", {"date_of_joining": c.window(starts)}, ["date_of_joining"])
	left = c.rows("Employee", {"relieving_date": c.window(starts)}, ["relieving_date"])
	active = c.rows("Employee", {"status": "Active"}, ["date_of_joining"]) or []
	exits = c.rows("Employee", {"relieving_date": ["between", [y_start, y_end]]}, ["reason_for_leaving"])

	bands = {label: 0 for _a, _b, label in BANDS}
	for e in active:
		if e.date_of_joining:
			yrs = date_diff(now, e.date_of_joining) / 365.25
			for lo, hi, label in BANDS:
				if lo <= yrs < hi:
					bands[label] += 1
					break
	avg_tenure = round(sum(date_diff(now, e.date_of_joining) for e in active if e.date_of_joining) / 365.25 / len(active), 1) if active else None

	return {
		"demo": False,
		"kpis": {
			"onboarding": c.count("Employee Onboarding", open_f),
			"separation": c.count("Employee Separation", open_f),
			"promotions": c.count("Employee Promotion", {"docstatus": 1, "promotion_date": ["between", [y_start, y_end]]}),
			"transfers": c.count("Employee Transfer", {"docstatus": 1, "transfer_date": ["between", [y_start, y_end]]}),
			"avg_tenure": avg_tenure,
		},
		"charts": {
			"movement": {
				"labels": c.month_labels(starts),
				"datasets": [
					{"name": _("Joined"), "values": c.monthly(joined, starts, "date_of_joining")},
					{"name": _("Relieved"), "values": c.monthly(left, starts, "relieving_date")},
				],
			}
			if joined is not None and left is not None
			else None,
			"tenure": {"labels": list(bands.keys()), "values": list(bands.values())},
			"changes": {
				"labels": c.month_labels(starts),
				"datasets": [
					{"name": _("Promotions"), "values": c.monthly(promos, starts, "promotion_date")},
					{"name": _("Transfers"), "values": c.monthly(transfers, starts, "transfer_date")},
				],
			}
			if promos is not None and transfers is not None
			else None,
			"exit_reasons": c.top(c.group_count(exits, "reason_for_leaving", _("Not recorded")), 5) if exits is not None else None,
		},
		"onboarding": [
			{"doctype": "Employee Onboarding", "name": r.name, "title": r.employee_name or r.name, "sub": " • ".join(x for x in [c.short(r.department), frappe.format(r.date_of_joining, "Date") if r.date_of_joining else ""] if x), "chip": _(r.boarding_status), "chipTone": "c-teal" if r.boarding_status == "In Process" else "c-gray"}
			for r in onb or []
		],
		"separation": [
			{"doctype": "Employee Separation", "name": r.name, "title": r.employee_name or r.name, "sub": " • ".join(x for x in [c.short(r.department), frappe.format(r.resignation_letter_date, "Date") if r.resignation_letter_date else ""] if x), "chip": _(r.boarding_status), "chipTone": "c-orange" if r.boarding_status == "In Process" else "c-gray"}
			for r in sep or []
		],
	}


def _demo(now, months):
	starts = c.month_starts(now, months)
	return {
		"demo": True,
		"kpis": {"onboarding": 6, "separation": 3, "promotions": 19, "transfers": 7, "avg_tenure": 6.8},
		"charts": {
			"movement": {"labels": c.month_labels(starts), "datasets": [{"name": "Joined", "values": c.cyc([4, 6, 3, 8, 5, 6, 2, 7, 4, 5, 9, 3], months)}, {"name": "Relieved", "values": c.cyc([2, 1, 3, 2, 4, 2, 1, 3, 2, 2, 1, 3], months)}]},
			"tenure": {"labels": [b[2] for b in BANDS], "values": [28, 54, 46, 62, 58]},
			"changes": {"labels": c.month_labels(starts), "datasets": [{"name": "Promotions", "values": c.cyc([1, 2, 0, 4, 3, 2, 1, 3, 2, 0, 5, 2], months)}, {"name": "Transfers", "values": c.cyc([1, 0, 1, 1, 2, 0, 1, 0, 1, 1, 0, 1], months)}]},
			"exit_reasons": {"labels": ["Higher studies", "Better prospects", "Superannuation", "Relocation", "Personal"], "values": [5, 4, 4, 2, 2]},
		},
		"onboarding": [
			{"doctype": "Employee Onboarding", "name": None, "title": "Dr. Kavya Iyer", "sub": f"Physics • joins {add_days(now, 5).strftime('%d %b')}", "chip": "In Process", "chipTone": "c-teal"},
			{"doctype": "Employee Onboarding", "name": None, "title": "Rahul Deshpande", "sub": f"CDS • joins {add_days(now, 12).strftime('%d %b')}", "chip": "Pending", "chipTone": "c-gray"},
			{"doctype": "Employee Onboarding", "name": None, "title": "Sneha Kulkarni", "sub": f"Library • joins {add_days(now, 18).strftime('%d %b')}", "chip": "Pending", "chipTone": "c-gray"},
		],
		"separation": [
			{"doctype": "Employee Separation", "name": None, "title": "Prakash Rao", "sub": "Civil Engineering • superannuation", "chip": "In Process", "chipTone": "c-orange"},
			{"doctype": "Employee Separation", "name": None, "title": "Neha Gupta", "sub": "Biochemistry • higher studies", "chip": "Pending", "chipTone": "c-gray"},
		],
	}
