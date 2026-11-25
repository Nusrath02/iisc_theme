"""Expenses module dashboard (workspace "Expenses", dashboard "Expense Claims")."""

import frappe
from frappe import _
from frappe.utils import add_days, flt

from iisc_theme.module_dashboards import common as c


def _currency():
	return frappe.defaults.get_global_default("currency") or "INR"


@frappe.whitelist()
def get_dashboard(months=6):
	months = c.months_arg(months)
	now = c.now_date()
	if c.use_demo():
		return _demo(now, months)

	cur = _currency()
	starts = c.month_starts(now, months)
	y_start, y_end = c.year_bounds(now)
	EC = "Expense Claim"
	year = c.rows(EC, {"docstatus": ["!=", 2], "posting_date": ["between", [y_start, y_end]]}, ["name", "total_claimed_amount", "total_sanctioned_amount", "total_amount_reimbursed", "department", "approval_status", "docstatus"])
	inwin = c.rows(EC, {"docstatus": ["!=", 2], "posting_date": c.window(starts)}, ["posting_date", "total_claimed_amount", "total_sanctioned_amount"])
	pending_rows = c.rows(EC, {"docstatus": 0, "approval_status": "Draft"}, ["name", "employee_name", "department", "total_claimed_amount", "currency", "posting_date", "creation"], limit=0)

	by_type = None
	if year:
		names = [r.name for r in year]
		details = frappe.get_all("Expense Claim Detail", filters={"parent": ["in", names], "parenttype": EC}, fields=["expense_type", "amount"])
		by_type = c.top(c.group_sum(details, "expense_type", "amount", _("Other")), 6)
	elif year is not None:
		by_type = {"labels": [], "values": []}

	adv = c.rows("Employee Advance", {"docstatus": 1}, ["name", "employee_name", "advance_amount", "paid_amount", "claimed_amount", "return_amount", "status", "posting_date", "currency", "purpose"])
	outstanding = [a for a in adv or [] if flt(a.paid_amount) - flt(a.claimed_amount) - flt(a.return_amount) > 0]

	claimed = sum(flt(r.total_claimed_amount) for r in year or [])
	sanctioned = sum(flt(r.total_sanctioned_amount) for r in year or [] if r.docstatus == 1)
	return {
		"demo": False,
		"currency": cur,
		"kpis": {
			"claimed": claimed if year is not None else None,
			"claims": len(year) if year is not None else None,
			"sanctioned": sanctioned if year is not None else None,
			"reimbursed": sum(flt(r.total_amount_reimbursed) for r in year or []) if year is not None else None,
			"pending": len(pending_rows) if pending_rows is not None else None,
			"pending_amount": sum(flt(r.total_claimed_amount) for r in pending_rows or []),
			"advances": sum(flt(a.paid_amount) - flt(a.claimed_amount) - flt(a.return_amount) for a in outstanding) if adv is not None else None,
			"advances_count": len(outstanding),
		},
		"charts": {
			"monthly": {
				"labels": c.month_labels(starts),
				"currency": cur,
				"datasets": [
					{"name": _("Claimed"), "values": c.monthly(inwin, starts, "posting_date", "total_claimed_amount")},
					{"name": _("Sanctioned"), "values": c.monthly(inwin, starts, "posting_date", "total_sanctioned_amount")},
				],
			}
			if inwin is not None
			else None,
			"by_type": by_type,
			"departments": dict(c.top({c.short(k) or _("Unassigned"): v for k, v in c.group_sum(year, "department", "total_claimed_amount").items()}, 7), currency=cur) if year is not None else None,
			"status": c.top(c.group_count(year, "approval_status", _("Draft")), 4) if year is not None else None,
		},
		"pending": [
			{
				"doctype": EC,
				"name": r.name,
				"employee_name": r.employee_name,
				"department": c.short(r.department),
				"type": _("Expense Claim"),
				"details": frappe.utils.fmt_money(r.total_claimed_amount or 0, currency=r.currency),
				"creation": str(r.creation),
				"tone": "c-red",
			}
			for r in (pending_rows or [])[:6]
		],
		"pending_total": len(pending_rows or []),
		"advances": [
			{
				"doctype": "Employee Advance",
				"name": a.name,
				"title": a.employee_name,
				"sub": (a.purpose or "")[:60],
				"chip": frappe.utils.fmt_money(flt(a.paid_amount) - flt(a.claimed_amount) - flt(a.return_amount), currency=a.currency),
				"chipTone": "c-orange",
			}
			for a in outstanding[:6]
		],
	}


def _demo(now, months):
	starts = c.month_starts(now, months)
	claimed = c.cyc([412000, 386000, 455000, 512000, 478000, 534000, 401000, 468000, 499000, 445000, 520000, 486000], months)
	return {
		"demo": True,
		"currency": "INR",
		"kpis": {"claimed": 4865000, "claims": 312, "sanctioned": 4412000, "reimbursed": 4180000, "pending": 12, "pending_amount": 186500, "advances": 245000, "advances_count": 7},
		"charts": {
			"monthly": {"labels": c.month_labels(starts), "currency": "INR", "datasets": [{"name": "Claimed", "values": claimed}, {"name": "Sanctioned", "values": [round(v * 0.91) for v in claimed]}]},
			"by_type": {"labels": ["Travel", "Conference Registration", "Lab Consumables", "Accommodation", "Local Conveyance", "Others"], "values": [1820000, 960000, 740000, 610000, 380000, 355000]},
			"departments": {"labels": ["Aerospace Engineering", "Physics", "Computational & Data Sciences", "Biochemistry", "Civil Engineering", "Administration", "Others"], "values": [910000, 845000, 760000, 640000, 520000, 410000, 780000], "currency": "INR"},
			"status": {"labels": ["Approved", "Draft", "Rejected"], "values": [284, 12, 16]},
		},
		"pending": [
			{"doctype": "Expense Claim", "name": None, "employee_name": "Priya Sharma", "department": "Centre for BioSystems", "type": "Expense Claim", "details": "₹ 14,250 · Conference travel", "creation": f"{now} 10:05:00", "tone": "c-red"},
			{"doctype": "Expense Claim", "name": None, "employee_name": "Dr. Aravind Kumar", "department": "Aerospace Engineering", "type": "Expense Claim", "details": "₹ 38,900 · Wind-tunnel consumables", "creation": f"{add_days(now, -1)} 15:30:00", "tone": "c-red"},
			{"doctype": "Expense Claim", "name": None, "employee_name": "Suresh Babu", "department": "Administration", "type": "Expense Claim", "details": "₹ 2,140 · Local conveyance", "creation": f"{add_days(now, -2)} 12:15:00", "tone": "c-red"},
		],
		"pending_total": 12,
		"advances": [
			{"doctype": "Employee Advance", "name": None, "title": "Vikram Shetty", "sub": "International conference – Zurich", "chip": "₹ 85,000", "chipTone": "c-orange"},
			{"doctype": "Employee Advance", "name": None, "title": "Dr. Meera Nair", "sub": "Field campaign – Western Ghats", "chip": "₹ 60,000", "chipTone": "c-orange"},
			{"doctype": "Employee Advance", "name": None, "title": "Rahul Deshpande", "sub": "HPC workshop – Pune", "chip": "₹ 25,000", "chipTone": "c-orange"},
		],
	}
