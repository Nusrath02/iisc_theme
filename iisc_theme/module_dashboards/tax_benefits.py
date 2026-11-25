"""Tax & Benefits module dashboard (workspace "Tax & Benefits")."""

import frappe
from frappe import _
from frappe.utils import flt

from iisc_theme.module_dashboards import common as c


def _currency():
	return frappe.defaults.get_global_default("currency") or "INR"


def _current_period(now):
	if not c.can_read("Payroll Period"):
		return None
	rows = frappe.get_list("Payroll Period", filters={"start_date": ["<=", now], "end_date": [">=", now]}, fields=["name", "start_date", "end_date"], limit_page_length=1)
	return rows[0] if rows else None


@frappe.whitelist()
def get_dashboard(months=6):
	months = c.months_arg(months)
	now = c.now_date()
	if c.use_demo():
		return _demo(now, months)

	cur = _currency()
	starts = c.month_starts(now, months)
	period = _current_period(now)
	pf = {"payroll_period": period.name} if period else {}
	DEC = "Employee Tax Exemption Declaration"
	PROOF = "Employee Tax Exemption Proof Submission"
	decl = c.rows(DEC, {**pf, "docstatus": ["!=", 2]}, ["name", "docstatus", "total_declared_amount", "total_exemption_amount"])
	proofs = c.rows(PROOF, {**pf, "docstatus": ["!=", 2]}, ["name", "docstatus", "total_actual_amount", "exemption_amount", "submission_date", "employee_name", "creation"])
	claims = c.rows("Employee Benefit Claim", {"docstatus": 1, "creation": ["between", [f"{starts[0]} 00:00:00", f"{now} 23:59:59"]]}, ["earning_component", "claimed_amount", "creation"])
	apps = c.count("Employee Benefit Application", {"docstatus": 1, **pf})

	by_category = None
	if decl:
		cats = frappe.get_all("Employee Tax Exemption Declaration Category", filters={"parent": ["in", [d.name for d in decl]], "parenttype": DEC}, fields=["exemption_category", "amount"])
		by_category = dict(c.top(c.group_sum(cats, "exemption_category", "amount"), 7), currency=cur)
	elif decl is not None:
		by_category = {"labels": [], "values": []}

	active = frappe.db.count("Employee", {"status": "Active"})
	return {
		"demo": False,
		"currency": cur,
		"period": {"name": period.name, "start": str(period.start_date), "end": str(period.end_date)} if period else None,
		"kpis": {
			"declarations": len(decl) if decl is not None else None,
			"declared_pct": round(len(decl) * 100.0 / active, 1) if decl is not None and active else None,
			"declared_amount": sum(flt(d.total_declared_amount) for d in decl or []) if decl is not None else None,
			"exemption": sum(flt(d.total_exemption_amount) for d in decl or [] if d.docstatus == 1) if decl is not None else None,
			"proofs": len(proofs) if proofs is not None else None,
			"proofs_draft": len([p for p in proofs or [] if p.docstatus == 0]),
			"benefit_claims": sum(flt(x.claimed_amount) for x in claims or []) if claims is not None else None,
			"benefit_apps": apps,
		},
		"charts": {
			"categories": by_category,
			"declaration_status": {"labels": [_("Submitted"), _("Draft"), _("Not declared")], "values": [len([d for d in decl if d.docstatus == 1]), len([d for d in decl if d.docstatus == 0]), max(active - len(decl), 0)]} if decl is not None else None,
			"benefits": c.top(c.group_sum(claims, "earning_component", "claimed_amount"), 6) if claims is not None else None,
			"proofs": {"labels": c.month_labels(starts), "datasets": [{"name": _("Proofs submitted"), "values": c.monthly(proofs, starts, "submission_date")}]} if proofs is not None else None,
		},
		"pending": [
			{"doctype": PROOF, "name": p.name, "title": p.employee_name, "sub": frappe.utils.fmt_money(p.total_actual_amount or 0, currency=cur), "chip": _("Draft"), "chipTone": "c-orange"}
			for p in sorted([p for p in proofs or [] if p.docstatus == 0], key=lambda p: str(p.creation), reverse=True)[:6]
		],
	}


def _demo(now, months):
	starts = c.month_starts(now, months)
	fy = now.year if now.month >= 4 else now.year - 1
	return {
		"demo": True,
		"currency": "INR",
		"period": {"name": f"FY {fy}-{str(fy + 1)[2:]}", "start": f"{fy}-04-01", "end": f"{fy + 1}-03-31"},
		"kpis": {"declarations": 214, "declared_pct": 86.3, "declared_amount": 38_600_000, "exemption": 31_200_000, "proofs": 96, "proofs_draft": 23, "benefit_claims": 1_840_000, "benefit_apps": 142},
		"charts": {
			"categories": {"labels": ["80C – PF, PPF, LIC, ELSS", "House Rent (HRA)", "80D – Health Insurance", "Home Loan Interest (24b)", "80CCD(1B) – NPS", "80E – Education Loan", "Others"], "values": [16_200_000, 9_800_000, 4_100_000, 3_900_000, 2_600_000, 1_200_000, 800_000], "currency": "INR"},
			"declaration_status": {"labels": ["Submitted", "Draft", "Not declared"], "values": [188, 26, 34]},
			"benefits": {"labels": ["Leave Travel Concession", "Children Education Allowance", "Medical Reimbursement", "Telephone / Internet", "Others"], "values": [720_000, 540_000, 320_000, 160_000, 100_000]},
			"proofs": {"labels": c.month_labels(starts), "datasets": [{"name": "Proofs submitted", "values": c.cyc([4, 6, 8, 11, 19, 48, 3, 5, 7, 12, 22, 51], months)}]},
		},
		"pending": [
			{"doctype": "Employee Tax Exemption Proof Submission", "name": None, "title": "Dr. Meera Nair", "sub": "₹ 1,50,000 · 80C + 80D", "chip": "Draft", "chipTone": "c-orange"},
			{"doctype": "Employee Tax Exemption Proof Submission", "name": None, "title": "Vikram Shetty", "sub": "₹ 2,10,000 · HRA + 80C", "chip": "Draft", "chipTone": "c-orange"},
			{"doctype": "Employee Tax Exemption Proof Submission", "name": None, "title": "Fathima Begum", "sub": "₹ 85,000 · 80CCD(1B)", "chip": "Draft", "chipTone": "c-orange"},
		],
	}
