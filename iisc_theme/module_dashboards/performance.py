"""Performance module dashboard (workspace "Performance")."""

import frappe
from frappe import _
from frappe.utils import add_days, flt, getdate

from iisc_theme.module_dashboards import common as c

BANDS = [(0, 1, "0–1"), (1, 2, "1–2"), (2, 3, "2–3"), (3, 4, "3–4"), (4, 5.01, "4–5")]


@frappe.whitelist()
def get_dashboard(months=6):
	months = c.months_arg(months)
	now = c.now_date()
	if c.use_demo():
		return _demo(now, months)

	cycles = c.rows("Appraisal Cycle", {}, ["name", "cycle_name", "status", "start_date", "end_date"], order_by="start_date desc", limit=5) or []
	current = next((x for x in cycles if x.status == "In Progress"), cycles[0] if cycles else None)
	af = {"appraisal_cycle": current.name} if current else {}
	appraisals = c.rows("Appraisal", {**af, "docstatus": ["!=", 2]}, ["name", "employee_name", "department", "docstatus", "final_score", "modified"]) if current else []
	goals = c.rows("Goal", af, ["status", "progress"]) if current else []

	scored = [flt(a.final_score) for a in appraisals or [] if a.final_score]
	bands = {label: 0 for _a, _b, label in BANDS}
	for s in scored:
		for lo, hi, label in BANDS:
			if lo <= s < hi:
				bands[label] += 1
				break

	starts = c.month_starts(now, months)
	fb = c.rows("Employee Performance Feedback", {"docstatus": 1, "added_on": c.window(starts)}, ["added_on"])
	drafts = [a for a in appraisals or [] if a.docstatus == 0]
	return {
		"demo": False,
		"cycle": {"name": current.name, "title": current.cycle_name or current.name, "status": current.status, "end": str(current.end_date or "")} if current else None,
		"kpis": {
			"appraisals": len(appraisals or []) if appraisals is not None else None,
			"submitted": len([a for a in appraisals or [] if a.docstatus == 1]),
			"draft": len(drafts),
			"avg_score": round(sum(scored) / len(scored), 2) if scored else None,
			"goals": len(goals or []) if goals is not None else None,
			"goals_done": len([g for g in goals or [] if g.status == "Completed"]),
			"goal_progress": round(sum(flt(g.progress) for g in goals) / len(goals), 1) if goals else None,
			"cycles_active": len([x for x in cycles if x.status == "In Progress"]),
		},
		"charts": {
			"appraisal_status": {"labels": [_("Submitted"), _("Draft")], "values": [len(appraisals or []) - len(drafts), len(drafts)]} if appraisals else None,
			"scores": {"labels": list(bands.keys()), "values": list(bands.values())},
			"goal_status": c.top(c.group_count(goals, "status", _("Pending")), 5) if goals is not None else None,
			"feedback": {"labels": c.month_labels(starts), "datasets": [{"name": _("Feedback given"), "values": c.monthly(fb, starts, "added_on")}]} if fb is not None else None,
		},
		"pending": [
			{"doctype": "Appraisal", "name": a.name, "title": a.employee_name, "sub": c.short(a.department) or "", "chip": _("Draft"), "chipTone": "c-orange"}
			for a in sorted(drafts, key=lambda a: str(a.modified), reverse=True)[:6]
		],
		"cycles": [
			{"doctype": "Appraisal Cycle", "name": x.name, "title": x.cycle_name or x.name, "sub": f"{frappe.format(x.start_date, 'Date')} – {frappe.format(x.end_date, 'Date')}", "chip": _(x.status or ""), "chipTone": "c-teal" if x.status == "In Progress" else "c-gray"}
			for x in cycles
		],
	}


def _demo(now, months):
	starts = c.month_starts(now, months)
	return {
		"demo": True,
		"cycle": {"name": None, "title": f"Annual Review {now.year}", "status": "In Progress", "end": str(add_days(now, 21))},
		"kpis": {"appraisals": 236, "submitted": 158, "draft": 78, "avg_score": 3.74, "goals": 612, "goals_done": 344, "goal_progress": 64.5, "cycles_active": 1},
		"charts": {
			"appraisal_status": {"labels": ["Submitted", "Draft"], "values": [158, 78]},
			"scores": {"labels": [b[2] for b in BANDS], "values": [2, 9, 31, 72, 44]},
			"goal_status": {"labels": ["Completed", "In Progress", "Pending", "Closed"], "values": [344, 186, 64, 18]},
			"feedback": {"labels": c.month_labels(starts), "datasets": [{"name": "Feedback given", "values": c.cyc([18, 24, 31, 42, 56, 71, 22, 26, 35, 40, 52, 66], months)}]},
		},
		"pending": [
			{"doctype": "Appraisal", "name": None, "title": "Dr. Aravind Kumar", "sub": "Aerospace Engineering", "chip": "Draft", "chipTone": "c-orange"},
			{"doctype": "Appraisal", "name": None, "title": "Fathima Begum", "sub": "Administration", "chip": "Draft", "chipTone": "c-orange"},
			{"doctype": "Appraisal", "name": None, "title": "Rahul Deshpande", "sub": "Computational & Data Sciences", "chip": "Draft", "chipTone": "c-orange"},
		],
		"cycles": [
			{"doctype": "Appraisal Cycle", "name": None, "title": f"Annual Review {now.year}", "sub": f"01 Oct {now.year} – {add_days(now, 21).strftime('%d %b %Y')}", "chip": "In Progress", "chipTone": "c-teal"},
			{"doctype": "Appraisal Cycle", "name": None, "title": f"Annual Review {now.year - 1}", "sub": f"01 Oct {now.year - 1} – 15 Dec {now.year - 1}", "chip": "Completed", "chipTone": "c-gray"},
		],
	}
