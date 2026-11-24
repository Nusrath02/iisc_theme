import frappe
from frappe import _
from frappe.utils import (
	add_months,
	date_diff,
	fmt_money,
	get_first_day,
	get_last_day,
	getdate,
	strip_html,
	today,
)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _can_read(doctype):
	return frappe.db.exists("DocType", doctype) and frappe.has_permission(doctype, "read")


def _count(doctype, filters):
	"""Count documents the current user is allowed to read (None = no access)."""
	if not _can_read(doctype):
		return None
	return len(frappe.get_list(doctype, filters=filters, pluck="name", limit_page_length=0))


def _default_holiday_list():
	company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value(
		"Global Defaults", "default_company"
	)
	if not company or not frappe.has_permission("Holiday List", "read"):
		return None
	return frappe.db.get_value("Company", company, "default_holiday_list")


# ---------------------------------------------------------------------------
# KPI cards
# ---------------------------------------------------------------------------
def _cards(now):
	month_start, month_end = get_first_day(now), get_last_day(now)
	year_start, year_end = getdate(f"{now.year}-01-01"), getdate(f"{now.year}-12-31")
	month = ["between", [month_start, month_end]]

	employees = {
		"total": _count("Employee", {"status": "Active"}),
		"joined": _count("Employee", {"date_of_joining": month}),
		"relieving": _count("Employee", {"relieving_date": month}),
		"left": _count("Employee", {"status": "Left"}),
	}

	leave_year = {"from_date": ["between", [year_start, year_end]], "docstatus": ["!=", 2]}
	leaves = {
		"total": _count("Leave Application", leave_year),
		"open": _count("Leave Application", {**leave_year, "status": "Open"}),
		"approved": _count("Leave Application", {**leave_year, "status": "Approved"}),
		"rejected": _count("Leave Application", {**leave_year, "status": "Rejected"}),
	}

	att_today = {"attendance_date": now, "docstatus": 1}
	attendance = {
		"present": _count("Attendance", {**att_today, "status": ["in", ["Present", "Work From Home", "Half Day"]]}),
		"absent": _count("Attendance", {**att_today, "status": "Absent"}),
		"on_leave": _count("Attendance", {**att_today, "status": "On Leave"}),
	}
	if attendance["present"] is not None and employees["total"]:
		attendance["present_pct"] = round(attendance["present"] * 100.0 / employees["total"], 1)
	else:
		attendance["present_pct"] = None

	slip_month = {"start_date": month}
	salary_slips = {
		"total": _count("Salary Slip", {**slip_month, "docstatus": ["!=", 2]}),
		"draft": _count("Salary Slip", {**slip_month, "docstatus": 0}),
		"submitted": _count("Salary Slip", {**slip_month, "docstatus": 1}),
		"cancelled": _count("Salary Slip", {**slip_month, "docstatus": 2}),
		"month_label": now.strftime("%b %Y"),
	}

	holidays = {"upcoming": None, "this_month": None, "holiday_list": None, "next": []}
	holiday_list = _default_holiday_list()
	if holiday_list:
		base = {"parent": holiday_list, "parenttype": "Holiday List", "weekly_off": 0}
		rows = frappe.get_all(
			"Holiday",
			filters={**base, "holiday_date": [">=", now]},
			fields=["holiday_date", "description"],
			order_by="holiday_date asc",
			limit_page_length=3,
		)
		holidays = {
			"holiday_list": holiday_list,
			"upcoming": frappe.db.count("Holiday", {**base, "holiday_date": ["between", [now, year_end]]}),
			"this_month": frappe.db.count("Holiday", {**base, "holiday_date": month}),
			"next": [
				{
					"date": str(r.holiday_date),
					"name": strip_html(r.description or "").strip() or _("Holiday"),
					"days_left": date_diff(r.holiday_date, now),
				}
				for r in rows
			],
		}

	return employees, leaves, attendance, salary_slips, holidays


# ---------------------------------------------------------------------------
# Overview + chart
# ---------------------------------------------------------------------------
OVERVIEW = [
	("Leave Applications", "Leave Application", {"status": "Approved"}),
	("Expense Claims", "Expense Claim", {"approval_status": "Approved"}),
	("Attendance Requests", "Attendance Request", {"docstatus": 1}),
	("Shift Requests", "Shift Request", {"status": "Approved"}),
]

SERIES = [
	("Leave Applications", "Leave Application", "from_date"),
	("Expense Claims", "Expense Claim", "posting_date"),
	("Attendance Requests", "Attendance Request", "from_date"),
]


def _overview():
	rows = []
	for label, doctype, approved_filter in OVERVIEW:
		total = _count(doctype, {"docstatus": ["!=", 2]})
		if total is None:
			continue
		approved = _count(doctype, {"docstatus": ["!=", 2], **approved_filter}) or 0
		rows.append({"label": label, "doctype": doctype, "total": total, "approved": approved})
	return rows


def _series(now, months):
	starts = [get_first_day(add_months(now, -i)) for i in range(months - 1, -1, -1)]
	datasets = []
	for label, doctype, date_field in SERIES:
		values = []
		for start in starts:
			c = _count(doctype, {date_field: ["between", [start, get_last_day(start)]], "docstatus": ["!=", 2]})
			if c is None:
				values = None
				break
			values.append(c)
		if values is not None:
			datasets.append({"name": label, "values": values})
	return {"labels": [d.strftime("%b %Y") for d in starts], "datasets": datasets}


# ---------------------------------------------------------------------------
# Pending approval queue + sidebar badges
# ---------------------------------------------------------------------------
# doctype -> (type label, pending filters, extra fields)
PENDING = {
	"Leave Application": (
		"Leave",
		{"status": "Open", "docstatus": 0},
		["leave_type", "from_date", "to_date", "total_leave_days"],
	),
	"Expense Claim": (
		"Expense",
		{"approval_status": "Draft", "docstatus": 0},
		["total_claimed_amount", "currency"],
	),
	"Attendance Request": (
		"Attendance Regularization",
		{"docstatus": 0},
		["reason", "from_date", "to_date"],
	),
	"Shift Request": (
		"Shift Request",
		{"status": "Draft", "docstatus": 0},
		["shift_type", "from_date", "to_date"],
	),
}


def _details(doctype, r):
	if doctype == "Leave Application":
		return {
			"type": r.leave_type or _("Leave"),
			"details": f"{frappe.format(r.from_date, 'Date')} – {frappe.format(r.to_date, 'Date')} "
			f"({r.total_leave_days or 0:g} {_('Days')})",
		}
	if doctype == "Expense Claim":
		return {"type": _("Expense Claim"), "details": fmt_money(r.total_claimed_amount or 0, currency=r.currency)}
	if doctype == "Attendance Request":
		return {
			"type": _("Attendance Regularization"),
			"details": f"{_(r.reason or '')} ({frappe.format(r.from_date, 'Date')})".strip(),
		}
	return {
		"type": _("Shift Request"),
		"details": f"{r.shift_type or ''} ({frappe.format(r.from_date, 'Date')})".strip(),
	}


def _pending(limit=5):
	items, total, by_doctype = [], 0, {}
	for doctype, (_label, filters, extra) in PENDING.items():
		if not _can_read(doctype):
			continue
		rows = frappe.get_list(
			doctype,
			filters=filters,
			fields=["name", "employee", "employee_name", "department", "creation", *extra],
			order_by="creation desc",
			limit_page_length=0,
		)
		by_doctype[doctype] = len(rows)
		total += len(rows)
		for r in rows[:limit]:
			items.append(
				{
					"doctype": doctype,
					"name": r.name,
					"employee": r.employee,
					"employee_name": r.employee_name or r.employee,
					"department": r.department,
					"creation": str(r.creation),
					**_details(doctype, r),
				}
			)
	items.sort(key=lambda i: i["creation"], reverse=True)
	return {"items": items[:limit], "total": total, "by_doctype": by_doctype}


def _notice():
	if not _can_read("Note"):
		return None
	rows = frappe.get_list(
		"Note",
		filters={"public": 1},
		fields=["name", "title", "content", "modified"],
		order_by="modified desc",
		limit_page_length=1,
	)
	if not rows:
		return None
	r = rows[0]
	text = strip_html(r.content or "").strip()
	return {"name": r.name, "title": r.title, "text": (text[:180] + "…") if len(text) > 180 else text}


# ---------------------------------------------------------------------------
# public API
# ---------------------------------------------------------------------------
@frappe.whitelist()
def get_hr_dashboard(months=6):
	"""Data for the IISc HR home on the Desk Apps screen."""
	months = 12 if str(months) == "12" else 6
	now = getdate(today())
	employees, leaves, attendance, salary_slips, holidays = _cards(now)
	pending = _pending()
	unread = None
	if frappe.db.exists("DocType", "Notification Log"):
		unread = frappe.db.count("Notification Log", {"for_user": frappe.session.user, "read": 0})
	return {
		"employees": employees,
		"leaves": leaves,
		"attendance": attendance,
		"salary_slips": salary_slips,
		"holidays": holidays,
		"overview": _overview(),
		"series": _series(now, months),
		"pending": pending,
		"notice": _notice(),
		"unread_notifications": unread,
		"today": str(now),
	}


@frappe.whitelist(methods=["POST"])
def act_on_request(doctype, name, action):
	"""Approve / reject a pending HR request from the dashboard queue.

	Uses the document's own submit permission and validations; documents that
	have an active Workflow must be handled from their form instead.
	"""
	if doctype not in PENDING or action not in ("Approve", "Reject"):
		frappe.throw(_("This action is not allowed."))

	if frappe.get_all("Workflow", filters={"document_type": doctype, "is_active": 1}, limit=1):
		frappe.throw(_("{0} uses a workflow. Open the document to approve or reject it.").format(_(doctype)))

	doc = frappe.get_doc(doctype, name)
	doc.check_permission("submit")
	if doc.docstatus != 0:
		frappe.throw(_("{0} {1} is no longer pending.").format(_(doctype), name))

	approved = action == "Approve"
	if doctype == "Leave Application":
		doc.status = "Approved" if approved else "Rejected"
	elif doctype == "Expense Claim":
		doc.approval_status = "Approved" if approved else "Rejected"
	elif doctype == "Shift Request":
		doc.status = "Approved" if approved else "Rejected"
	elif doctype == "Attendance Request" and not approved:
		frappe.throw(_("Attendance Requests can't be rejected from the dashboard. Open the request instead."))

	doc.submit()
	return {"doctype": doctype, "name": doc.name, "action": action}
