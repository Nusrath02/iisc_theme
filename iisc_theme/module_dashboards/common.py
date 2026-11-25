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


# ---------------------------------------------------------------------------
# aggregation helpers (all work on rows already permission-filtered)
# ---------------------------------------------------------------------------
def top(pairs, n=7, other=None):
	"""{label: value} -> {"labels", "values"} sorted desc, rest folded into 'Others'."""
	from frappe import _

	items = sorted(pairs.items(), key=lambda kv: (-kv[1], str(kv[0])))
	head, rest = items[:n], sum(v for _k, v in items[n:])
	if rest:
		head.append((other or _("Others"), rest))
	return {"labels": [k for k, _v in head], "values": [round(v, 2) for _k, v in head]}


def group_count(rs, key, default=None):
	from collections import Counter

	return Counter((r.get(key) or default) for r in rs or [])


def group_sum(rs, key, value, default=None):
	from collections import defaultdict

	from frappe.utils import flt

	out = defaultdict(float)
	for r in rs or []:
		out[r.get(key) or default] += flt(r.get(value))
	return out


def monthly(rs, starts, date_field, value_field=None):
	"""Per-month count (or sum of value_field) for the given month starts."""
	from frappe.utils import flt

	vals = [0] * len(starts)
	for r in rs or []:
		i = bucket(starts, r.get(date_field))
		if i is not None:
			vals[i] += flt(r.get(value_field)) if value_field else 1
	return [round(v, 2) for v in vals]


def window(starts):
	return ["between", [starts[0], get_last_day(starts[-1])]]


def cyc(values, n):
	return [values[i % len(values)] for i in range(n)]
