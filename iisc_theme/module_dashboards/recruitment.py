"""Recruitment module dashboard (workspace "Recruitment", dashboard "Recruitment")."""

import frappe
from frappe import _
from frappe.utils import add_days, getdate

from iisc_theme.module_dashboards import common as c


@frappe.whitelist()
def get_dashboard(months=6):
	months = c.months_arg(months)
	now = c.now_date()
	if c.use_demo():
		return _demo(now, months)

	starts = c.month_starts(now, months)
	openings = c.rows("Job Opening", {"status": "Open"}, ["name", "job_title", "department", "designation", "planned_vacancies", "closes_on"], limit=0)
	applicants = c.rows("Job Applicant", {"creation": ["between", [f"{starts[0]} 00:00:00", f"{now} 23:59:59"]]}, ["status", "source", "job_title", "creation"])
	offers = c.rows("Job Offer", {"docstatus": ["!=", 2], "offer_date": c.window(starts)}, ["status"])
	interviews = c.rows("Interview", {"docstatus": ["!=", 2], "scheduled_on": ["between", [now, add_days(now, 7)]]}, ["name", "job_applicant", "job_opening", "designation", "scheduled_on", "from_time", "status"], order_by="scheduled_on asc", limit=6)

	applicant_names = {}
	ids = [i.job_applicant for i in interviews or [] if i.job_applicant]
	if ids and c.can_read("Job Applicant"):
		applicant_names = {r.name: r.applicant_name for r in frappe.get_list("Job Applicant", filters={"name": ["in", ids]}, fields=["name", "applicant_name"])}

	by_status = c.group_count(applicants, "status", _("Open"))
	offer_status = c.group_count(offers, "status")
	interviewed = c.count("Interview", {"docstatus": ["!=", 2], "scheduled_on": c.window(starts)})
	applicant_count = {}
	for a in applicants or []:
		if a.job_title:
			applicant_count[a.job_title] = applicant_count.get(a.job_title, 0) + 1

	return {
		"demo": False,
		"kpis": {
			"openings": len(openings) if openings is not None else None,
			"vacancies": sum(int(o.planned_vacancies or 0) for o in openings or []),
			"applicants": len(applicants) if applicants is not None else None,
			"shortlisted": by_status.get("Shortlisted", 0),
			"interviews_week": len(interviews) if interviews is not None else None,
			"offers": len(offers) if offers is not None else None,
			"accepted": offer_status.get("Accepted", 0),
		},
		"charts": {
			"funnel": {
				"labels": [_("Applied"), _("Shortlisted"), _("Interviewed"), _("Offered"), _("Accepted")],
				"values": [len(applicants or []), by_status.get("Shortlisted", 0) + by_status.get("Accepted", 0), interviewed or 0, len(offers or []), offer_status.get("Accepted", 0)],
			},
			"monthly": {"labels": c.month_labels(starts), "datasets": [{"name": _("Applications"), "values": c.monthly(applicants, starts, "creation")}]} if applicants is not None else None,
			"sources": c.top(c.group_count(applicants, "source", _("Not set")), 6) if applicants is not None else None,
			"departments": c.top({c.short(k) or _("Unassigned"): int(v or 0) for k, v in c.group_sum(openings, "department", "planned_vacancies").items()}, 7) if openings is not None else None,
		},
		"interviews": [
			{
				"doctype": "Interview",
				"name": i.name,
				"title": applicant_names.get(i.job_applicant) or i.job_applicant or i.name,
				"sub": " • ".join(x for x in [i.designation or i.job_opening, str(i.from_time)[:5] if i.from_time else ""] if x),
				"chip": getdate(i.scheduled_on).strftime("%a %d %b"),
				"chipTone": "c-teal" if getdate(i.scheduled_on) == now else "c-gray",
			}
			for i in interviews or []
		],
		"openings": [
			{
				"doctype": "Job Opening",
				"name": o.name,
				"title": o.job_title or o.designation or o.name,
				"sub": " • ".join(x for x in [c.short(o.department), _("{0} vacancies").format(o.planned_vacancies) if o.planned_vacancies else ""] if x),
				"chip": _("{0} applicants").format(applicant_count.get(o.name, 0)),
				"chipTone": "c-blue",
			}
			for o in (openings or [])[:6]
		],
	}


def _demo(now, months):
	starts = c.month_starts(now, months)
	return {
		"demo": True,
		"kpis": {"openings": 9, "vacancies": 21, "applicants": 486, "shortlisted": 74, "interviews_week": 12, "offers": 18, "accepted": 13},
		"charts": {
			"funnel": {"labels": ["Applied", "Shortlisted", "Interviewed", "Offered", "Accepted"], "values": [486, 74, 52, 18, 13]},
			"monthly": {"labels": c.month_labels(starts), "datasets": [{"name": "Applications", "values": c.cyc([54, 68, 92, 71, 85, 116, 48, 62, 88, 77, 95, 104], months)}]},
			"sources": {"labels": ["IISc Careers Page", "Referral", "LinkedIn", "Campus Drive", "Walk-in"], "values": [212, 96, 88, 64, 26]},
			"departments": {"labels": ["Computational & Data Sciences", "Aerospace Engineering", "Physics", "Biochemistry", "Administration"], "values": [6, 5, 4, 3, 3]},
		},
		"interviews": [
			{"doctype": "Interview", "name": None, "title": "Nikhil Joshi", "sub": "Project Scientist (CDS) • 10:30", "chip": now.strftime("%a %d %b"), "chipTone": "c-teal"},
			{"doctype": "Interview", "name": None, "title": "Shreya Pillai", "sub": "Research Associate (Physics) • 14:00", "chip": add_days(now, 1).strftime("%a %d %b"), "chipTone": "c-gray"},
			{"doctype": "Interview", "name": None, "title": "Mohan Kumar", "sub": "Technical Officer (Aerospace) • 11:00", "chip": add_days(now, 2).strftime("%a %d %b"), "chipTone": "c-gray"},
		],
		"openings": [
			{"doctype": "Job Opening", "name": None, "title": "Project Scientist – HPC", "sub": "Computational & Data Sciences • 3 vacancies", "chip": "128 applicants", "chipTone": "c-blue"},
			{"doctype": "Job Opening", "name": None, "title": "Research Associate – Quantum Materials", "sub": "Physics • 2 vacancies", "chip": "94 applicants", "chipTone": "c-blue"},
			{"doctype": "Job Opening", "name": None, "title": "Technical Officer – Wind Tunnel", "sub": "Aerospace Engineering • 1 vacancy", "chip": "61 applicants", "chipTone": "c-blue"},
		],
	}
