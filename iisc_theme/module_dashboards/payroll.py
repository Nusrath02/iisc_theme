"""Payroll module dashboard (workspace "Payroll", dashboard "Payroll")."""

import frappe
from frappe import _
from frappe.utils import add_days, flt, get_first_day, get_last_day

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
	m_start, m_end = get_first_day(now), get_last_day(now)
	SS = "Salary Slip"
	month_slips = c.rows(SS, {"start_date": ["between", [m_start, m_end]]}, ["name", "docstatus", "gross_pay", "net_pay", "total_deduction", "department"])
	win = c.rows(SS, {"docstatus": 1, "start_date": c.window(starts)}, ["name", "start_date", "gross_pay", "net_pay", "total_deduction", "department"])

	# Latest submitted month: earnings by component
	components = None
	if win:
		last_i = max(c.bucket(starts, r.start_date) or 0 for r in win)
		latest = [r.name for r in win if c.bucket(starts, r.start_date) == last_i]
		det = frappe.get_all("Salary Detail", filters={"parent": ["in", latest], "parenttype": SS, "parentfield": "earnings"}, fields=["salary_component", "amount"])
		components = c.top(c.group_sum(det, "salary_component", "amount"), 6)
	elif win is not None:
		components = {"labels": [], "values": []}

	active = frappe.db.count("Employee", {"status": "Active"})
	with_ssa = None
	if c.can_read("Salary Structure Assignment"):
		with_ssa = len(set(frappe.get_list("Salary Structure Assignment", filters={"docstatus": 1, "from_date": ["<=", now]}, pluck="employee", limit_page_length=0)))

	entries = c.rows("Payroll Entry", {"docstatus": ["!=", 2]}, ["name", "posting_date", "start_date", "end_date", "status", "number_of_employees"], order_by="posting_date desc", limit=5)
	submitted = [r for r in month_slips or [] if r.docstatus == 1]
	return {
		"demo": False,
		"currency": cur,
		"kpis": {
			"gross": sum(flt(r.gross_pay) for r in submitted) if month_slips is not None else None,
			"net": sum(flt(r.net_pay) for r in submitted) if month_slips is not None else None,
			"deductions": sum(flt(r.total_deduction) for r in submitted) if month_slips is not None else None,
			"slips": len([r for r in month_slips or [] if r.docstatus != 2]) if month_slips is not None else None,
			"slips_draft": len([r for r in month_slips or [] if r.docstatus == 0]),
			"slips_submitted": len(submitted),
			"month_label": now.strftime("%b %Y"),
			"no_structure": max(active - with_ssa, 0) if with_ssa is not None else None,
			"active": active,
		},
		"charts": {
			"monthly": {
				"labels": c.month_labels(starts),
				"currency": cur,
				"datasets": [
					{"name": _("Gross Pay"), "values": c.monthly(win, starts, "start_date", "gross_pay")},
					{"name": _("Net Pay"), "values": c.monthly(win, starts, "start_date", "net_pay")},
				],
			}
			if win is not None
			else None,
			"deductions": {"labels": c.month_labels(starts), "currency": cur, "datasets": [{"name": _("Deductions"), "values": c.monthly(win, starts, "start_date", "total_deduction")}]} if win is not None else None,
			"departments": dict(c.top({c.short(k) or _("Unassigned"): v for k, v in c.group_sum(win, "department", "gross_pay").items()}, 7), currency=cur) if win is not None else None,
			"components": components,
		},
		"entries": [
			{
				"doctype": "Payroll Entry",
				"name": r.name,
				"title": f"{frappe.format(r.start_date, 'Date')} – {frappe.format(r.end_date, 'Date')}",
				"sub": _("{0} employees").format(r.number_of_employees or 0),
				"chip": _(r.status or ""),
				"chipTone": "c-teal" if r.status == "Submitted" else ("c-red" if r.status == "Failed" else "c-gray"),
			}
			for r in entries or []
		],
	}


def _demo(now, months):
	starts = c.month_starts(now, months)
	gross = [21_800_000 + 180_000 * i for i in range(months)]
	return {
		"demo": True,
		"currency": "INR",
		"kpis": {"gross": gross[-1], "net": round(gross[-1] * 0.835), "deductions": round(gross[-1] * 0.165), "slips": 240, "slips_draft": 12, "slips_submitted": 226, "month_label": now.strftime("%b %Y"), "no_structure": 8, "active": 248},
		"charts": {
			"monthly": {"labels": c.month_labels(starts), "currency": "INR", "datasets": [{"name": "Gross Pay", "values": gross}, {"name": "Net Pay", "values": [round(g * 0.835) for g in gross]}]},
			"deductions": {"labels": c.month_labels(starts), "currency": "INR", "datasets": [{"name": "Deductions", "values": [round(g * 0.165) for g in gross]}]},
			"departments": {"labels": ["Physics", "Aerospace Engineering", "Administration", "Computational & Data Sciences", "Biochemistry", "Civil Engineering", "Others"], "values": [3_950_000, 3_420_000, 3_100_000, 2_880_000, 2_640_000, 2_210_000, 4_600_000], "currency": "INR"},
			"components": {"labels": ["Basic Pay", "Dearness Allowance", "House Rent Allowance", "Transport Allowance", "Research Allowance", "Others"], "values": [11_200_000, 5_600_000, 3_020_000, 980_000, 760_000, 1_240_000]},
		},
		"entries": [
			{"doctype": "Payroll Entry", "name": None, "title": f"{c.month_starts(now, 1)[0].strftime('%d %b')} – {get_last_day(now).strftime('%d %b %Y')}", "sub": "240 employees", "chip": "Draft", "chipTone": "c-gray"},
			{"doctype": "Payroll Entry", "name": None, "title": f"{starts[-2].strftime('%d %b')} – {get_last_day(starts[-2]).strftime('%d %b %Y')}", "sub": "238 employees", "chip": "Submitted", "chipTone": "c-teal"},
			{"doctype": "Payroll Entry", "name": None, "title": f"{starts[-3].strftime('%d %b')} – {get_last_day(starts[-3]).strftime('%d %b %Y')}", "sub": "236 employees", "chip": "Submitted", "chipTone": "c-teal"},
		],
	}
