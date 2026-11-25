"""Shared helpers for the IISc module dashboards (one file per module)."""

import frappe
from frappe.utils import add_months, get_first_day, get_last_day, getdate, today


def can_read(doctype):
	return frappe.db.exists("DocType", doctype) and frappe.has_permission(doctype, "read")


def count(doctype, filters):
	"""Documents the current user may read (None = no access)."""
	if not can_read(doctype):
		return None
	return len(frappe.get_list(doctype, filters=filters, pluck="name", limit_page_length=0))


def rows(doctype, filters, fields, order_by=None, limit=0):
	if not can_read(doctype):
		return None
	return frappe.get_list(
		doctype, filters=filters, fields=fields, order_by=order_by or "creation desc", limit_page_length=limit
	)


def short(name):
	"""'Physics - IISC' -> 'Physics' (drop the company abbreviation)."""
	return name.rsplit(" - ", 1)[0] if name and " - " in name else name


def months_arg(months):
	return 12 if str(months) == "12" else 6


def month_starts(now, months):
	return [get_first_day(add_months(now, -i)) for i in range(months - 1, -1, -1)]


def month_labels(starts):
	return [d.strftime("%b %y") if (i == 0 or d.month == 1) else d.strftime("%b") for i, d in enumerate(starts)]


def bucket(starts, value):
	if not value:
		return None
	d = getdate(value)
	for i, start in enumerate(starts):
		if start <= d <= get_last_day(start):
			return i
	return None


def now_date():
	return getdate(today())


def year_bounds(now):
	return getdate(f"{now.year}-01-01"), getdate(f"{now.year}-12-31")


def use_demo():
	"""Sample data while the site has no active employees.
	site_config.json "iisc_dashboard_demo": 0 / 1 forces it off / on."""
	setting = frappe.conf.get("iisc_dashboard_demo")
	if setting is not None:
		return bool(int(setting))
	return not frappe.db.count("Employee", {"status": "Active"})
