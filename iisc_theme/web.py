"""Public (website) helpers for the IISc careers page (/jobs)."""

import frappe

from iisc_theme.module_dashboards.common import use_demo


@frappe.whitelist(allow_guest=True)
def careers_context():
	"""Hero stats for /jobs, and whether to show sample openings.

	Sample openings are shown only while the site has no active employees
	(same switch as the desk dashboards; site_config "iisc_dashboard_demo"
	0/1 forces it) AND there are no published openings.
	"""
	filters = {"status": "Open", "publish": 1}
	openings = frappe.get_all("Job Opening", filters=filters, fields=["department", "planned_vacancies"])
	return {
		"demo": bool(use_demo() and not openings),
		"openings": len(openings),
		"departments": len({o.department for o in openings if o.department}),
		"vacancies": sum(int(o.planned_vacancies or 0) for o in openings),
	}


@frappe.whitelist(allow_guest=True)
def job_opening_summary(name):
	"""Public details of a published, open Job Opening (shown above the
	application form)."""
	row = frappe.db.get_value(
		"Job Opening",
		{"name": name, "publish": 1, "status": "Open"},
		["name", "job_title", "department", "location", "employment_type", "closes_on", "route"],
		as_dict=True,
	)
	if not row:
		return None
	dept = row.department or ""
	if " - " in dept:
		dept = dept.rsplit(" - ", 1)[0]
	return {
		"name": row.name,
		"title": row.job_title,
		"department": dept,
		"location": row.location,
		"employment_type": row.employment_type,
		"closes_on": str(row.closes_on) if row.closes_on else None,
		"route": row.route,
	}
