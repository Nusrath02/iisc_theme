from collections import Counter, defaultdict

import frappe
from frappe import _
from frappe.utils import (
	add_days,
	add_months,
	flt,
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
	return {"labels": _month_labels(starts), "datasets": datasets}


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
# Insight charts (all respect the user's read permissions)
# ---------------------------------------------------------------------------
def _rows(doctype, filters, fields):
	if not _can_read(doctype):
		return None
	return frappe.get_list(doctype, filters=filters, fields=fields, limit_page_length=0)


def _short(name):
	"""'Physics - IISC' -> 'Physics' (drop the company abbreviation)."""
	return name.rsplit(" - ", 1)[0] if name and " - " in name else name


def _top(counter, n=7):
	items = sorted(counter.items(), key=lambda kv: (-kv[1], kv[0]))
	top, rest = items[:n], sum(v for _k, v in items[n:])
	if rest:
		top.append((_("Others"), rest))
	return {"labels": [k for k, _v in top], "values": [round(v, 1) for _k, v in top]}


def _month_labels(starts):
	"""'Jun 26', 'Jul', 'Aug' … — year only on the first bar and on January."""
	return [d.strftime("%b %y") if (i == 0 or d.month == 1) else d.strftime("%b") for i, d in enumerate(starts)]


def _month_starts(now, months):
	return [get_first_day(add_months(now, -i)) for i in range(months - 1, -1, -1)]


def _bucket(starts, value):
	"""Index of the month (from starts) that a date falls into, or None."""
	if not value:
		return None
	d = getdate(value)
	for i, start in enumerate(starts):
		if start <= d <= get_last_day(start):
			return i
	return None


def _insights(now, months):
	starts = _month_starts(now, months)
	window = ["between", [starts[0], get_last_day(starts[-1])]]
	labels = _month_labels(starts)
	out = {}

	# Headcount by department + workforce mix (active staff)
	emps = _rows("Employee", {"status": "Active"}, ["department", "employment_type", "gender"])
	if emps is not None:
		out["departments"] = _top(Counter(_short(e.department) or _("Unassigned") for e in emps), 8)
		out["workforce"] = _top(Counter(e.employment_type or _("Not Set") for e in emps), 5)
		out["gender"] = _top(Counter(e.gender or _("Not Set") for e in emps), 4)

	# Joiners vs leavers per month
	joined = _rows("Employee", {"date_of_joining": window}, ["date_of_joining"])
	left = _rows("Employee", {"relieving_date": window}, ["relieving_date"])
	if joined is not None and left is not None:
		j, l = [0] * months, [0] * months
		for r in joined:
			i = _bucket(starts, r.date_of_joining)
			if i is not None:
				j[i] += 1
		for r in left:
			i = _bucket(starts, r.relieving_date)
			if i is not None:
				l[i] += 1
		out["movement"] = {
			"labels": labels,
			"datasets": [{"name": _("Joined"), "values": j}, {"name": _("Relieved"), "values": l}],
		}

	# Approved leave days by type (this year)
	leaves = _rows(
		"Leave Application",
		{"status": "Approved", "docstatus": 1, "from_date": ["between", [getdate(f"{now.year}-01-01"), now.replace(month=12, day=31)]]},
		["leave_type", "total_leave_days"],
	)
	if leaves is not None:
		days = defaultdict(float)
		for r in leaves:
			days[r.leave_type or _("Other")] += flt(r.total_leave_days)
		out["leave_types"] = _top(days, 6)

	# Attendance, last 14 days
	since = add_days(now, -13)
	att = _rows("Attendance", {"docstatus": 1, "attendance_date": ["between", [since, now]]}, ["attendance_date", "status"])
	if att is not None:
		dates = [add_days(since, i) for i in range(14)]
		idx = {str(d): i for i, d in enumerate(dates)}
		present, on_leave, absent = [0] * 14, [0] * 14, [0] * 14
		for r in att:
			i = idx.get(str(r.attendance_date))
			if i is None:
				continue
			if r.status in ("Present", "Work From Home", "Half Day"):
				present[i] += 1
			elif r.status == "On Leave":
				on_leave[i] += 1
			elif r.status == "Absent":
				absent[i] += 1
		out["attendance_trend"] = {
			"labels": [d.strftime("%d %b") for d in dates],
			"datasets": [
				{"name": _("Present"), "values": present},
				{"name": _("On Leave"), "values": on_leave},
				{"name": _("Absent"), "values": absent},
			],
		}

	# Payroll cost per month (submitted salary slips)
	slips = _rows("Salary Slip", {"docstatus": 1, "start_date": window}, ["start_date", "gross_pay", "net_pay", "currency"])
	if slips is not None:
		gross, net = [0.0] * months, [0.0] * months
		for r in slips:
			i = _bucket(starts, r.start_date)
			if i is not None:
				gross[i] += flt(r.gross_pay)
				net[i] += flt(r.net_pay)
		currency = (slips[0].currency if slips else None) or frappe.defaults.get_global_default("currency") or "INR"
		out["payroll"] = {
			"labels": labels,
			"currency": currency,
			"datasets": [
				{"name": _("Gross Pay"), "values": [round(v, 2) for v in gross]},
				{"name": _("Net Pay"), "values": [round(v, 2) for v in net]},
			],
			"total_gross": round(sum(gross), 2),
		}

	return out


def _celebrations(now, days=30):
	"""Birthdays and work anniversaries in the next `days` days."""
	rows = _rows("Employee", {"status": "Active"}, ["name", "employee_name", "department", "date_of_birth", "date_of_joining"])
	if rows is None:
		return None
	items = []

	def next_occurrence(d):
		d = getdate(d)
		for year in (now.year, now.year + 1):
			try:
				candidate = d.replace(year=year)
			except ValueError:  # 29 Feb in a non-leap year
				candidate = d.replace(year=year, day=28)
			if candidate >= now:
				return candidate
		return None

	for r in rows:
		for kind, value in (("birthday", r.date_of_birth), ("anniversary", r.date_of_joining)):
			if not value:
				continue
			nxt = next_occurrence(value)
			if not nxt:
				continue
			left = date_diff(nxt, now)
			years = nxt.year - getdate(value).year
			if left > days or (kind == "anniversary" and years < 1):
				continue
			items.append(
				{
					"employee": r.name,
					"employee_name": r.employee_name or r.name,
					"department": _short(r.department),
					"kind": kind,
					"date": str(nxt),
					"days_left": left,
					"years": years if kind == "anniversary" else None,
				}
			)
	items.sort(key=lambda i: (i["days_left"], i["employee_name"]))
	return items[:6]


# ---------------------------------------------------------------------------
# public API
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Demo data — shown automatically while the site has no active employees,
# so the home page can be reviewed before real HR data is loaded.
# Set "iisc_dashboard_demo": 0 in site_config.json to turn it off.
# ---------------------------------------------------------------------------
def _use_demo(employees):
	setting = frappe.conf.get("iisc_dashboard_demo")
	if setting is not None:
		return bool(int(setting))
	return not employees.get("total")


def _demo(now, months):
	starts = _month_starts(now, months)
	labels = _month_labels(starts)

	def cycle(values):
		return [values[i % len(values)] for i in range(months)]

	days = [add_days(now, -13 + i) for i in range(14)]
	present, on_leave, absent = [], [], []
	for i, d in enumerate(days):
		if d.weekday() == 6:  # Sundays: no attendance
			present.append(0), on_leave.append(0), absent.append(0)
			continue
		present.append([212, 215, 209, 214, 211, 216, 213][i % 7])
		on_leave.append([14, 11, 15, 12, 13, 9, 12][i % 7])
		absent.append([6, 4, 7, 5, 6, 3, 5][i % 7])

	def at(days_ahead, hour=10):
		return f"{add_days(now, days_ahead)} {hour:02d}:15:00"

	return {
		"demo": True,
		"employees": {"total": 248, "joined": 6, "relieving": 2, "left": 17},
		"leaves": {"total": 132, "open": 9, "approved": 110, "rejected": 13},
		"attendance": {"present": 212, "absent": 8, "on_leave": 14, "present_pct": 85.5},
		"salary_slips": {"total": 240, "draft": 12, "submitted": 226, "cancelled": 2, "month_label": now.strftime("%b %Y")},
		"holidays": {
			"upcoming": 4,
			"this_month": 1,
			"holiday_list": "IISc Holidays (Demo)",
			"next": [
				{"date": str(add_days(now, 2)), "name": "Kanakadasa Jayanti", "days_left": 2},
				{"date": str(add_days(now, 30)), "name": "Christmas Day", "days_left": 30},
				{"date": str(add_days(now, 37)), "name": "New Year's Day", "days_left": 37},
			],
		},
		"overview": [
			{"label": "Leave Applications", "doctype": "Leave Application", "total": 132, "approved": 110},
			{"label": "Expense Claims", "doctype": "Expense Claim", "total": 48, "approved": 36},
			{"label": "Attendance Requests", "doctype": "Attendance Request", "total": 30, "approved": 27},
			{"label": "Shift Requests", "doctype": "Shift Request", "total": 12, "approved": 8},
		],
		"series": {
			"labels": labels,
			"datasets": [
				{"name": "Leave Applications", "values": cycle([18, 22, 15, 25, 28, 24, 20, 26, 19, 23, 27, 21])},
				{"name": "Expense Claims", "values": cycle([6, 8, 7, 9, 10, 8, 7, 11, 9, 8, 10, 12])},
				{"name": "Attendance Requests", "values": cycle([3, 5, 4, 6, 5, 7, 4, 6, 5, 3, 6, 5])},
			],
		},
		"pending": {
			"total": 14,
			"by_doctype": {"Leave Application": 9, "Expense Claim": 3, "Attendance Request": 1, "Shift Request": 1},
			"items": [
				{"doctype": "Leave Application", "name": "DEMO-LEAVE-1", "employee_name": "Dr. Aravind Kumar", "department": "Aerospace Engineering", "type": "Casual Leave", "details": "3 Days (from next Monday)", "creation": at(0, 10)},
				{"doctype": "Expense Claim", "name": "DEMO-EXP-1", "employee_name": "Priya Sharma", "department": "Centre for BioSystems", "type": "Expense Claim", "details": "₹ 14,250.00 (Conference travel)", "creation": at(-1, 15)},
				{"doctype": "Shift Request", "name": "DEMO-SHIFT-1", "employee_name": "Rajesh Menon", "department": "SERC", "type": "Shift Request", "details": "Night Shift → Day Shift", "creation": at(-2, 9)},
				{"doctype": "Attendance Request", "name": "DEMO-ATT-1", "employee_name": "Kavya Iyer", "department": "Physics", "type": "Attendance Regularization", "details": "On Duty (Field work)", "creation": at(-3, 11)},
				{"doctype": "Leave Application", "name": "DEMO-LEAVE-2", "employee_name": "Mohammed Faisal", "department": "Library", "type": "Earned Leave", "details": "5 Days (next month)", "creation": at(-4, 16)},
			],
		},
		"notice": {
			"name": None,
			"title": "Annual Tax Declaration",
			"text": "All faculty and staff must submit their IT investment proofs for FY 2026-27 before 15 December.",
		},
		"insights": {
			"departments": {
				"labels": ["Physics", "Aerospace Engineering", "Computational & Data Sciences", "Biochemistry", "Civil Engineering", "Administration", "J.R.D. Tata Library", "Others"],
				"values": [42, 36, 30, 28, 24, 40, 12, 36],
			},
			"workforce": {"labels": ["Full-time", "Contract", "Probation", "Intern", "Part-time"], "values": [180, 34, 14, 12, 8]},
			"gender": {"labels": ["Male", "Female", "Other"], "values": [150, 94, 4]},
			"attendance_trend": {
				"labels": [d.strftime("%d %b") for d in days],
				"datasets": [
					{"name": "Present", "values": present},
					{"name": "On Leave", "values": on_leave},
					{"name": "Absent", "values": absent},
				],
			},
			"leave_types": {"labels": ["Earned Leave", "Casual Leave", "Sick Leave", "Compensatory Off", "Leave Without Pay"], "values": [210, 120, 64, 22, 8]},
			"payroll": {
				"labels": labels,
				"currency": "INR",
				"datasets": [
					{"name": "Gross Pay", "values": [21_800_000 + 180_000 * i for i in range(months)]},
					{"name": "Net Pay", "values": [18_200_000 + 150_000 * i for i in range(months)]},
				],
				"total_gross": sum(21_800_000 + 180_000 * i for i in range(months)),
			},
			"movement": {
				"labels": labels,
				"datasets": [
					{"name": "Joined", "values": cycle([4, 6, 3, 8, 5, 6, 2, 7, 4, 5, 9, 3])},
					{"name": "Relieved", "values": cycle([2, 1, 3, 2, 4, 2, 1, 3, 2, 2, 1, 3])},
				],
			},
		},
		"celebrations": [
			{"employee": None, "employee_name": "Dr. Aravind Kumar", "department": "Aerospace Engineering", "kind": "birthday", "date": str(now), "days_left": 0, "years": None},
			{"employee": None, "employee_name": "Priya Sharma", "department": "Centre for BioSystems", "kind": "anniversary", "date": str(add_days(now, 4)), "days_left": 4, "years": 10},
			{"employee": None, "employee_name": "Rajesh Menon", "department": "SERC", "kind": "birthday", "date": str(add_days(now, 12)), "days_left": 12, "years": None},
		],
		"unread_notifications": 0,
		"today": str(now),
	}


@frappe.whitelist()
def get_hr_dashboard(months=6):
	"""Data for the IISc HR home on the Desk Apps screen."""
	months = 12 if str(months) == "12" else 6
	now = getdate(today())
	employees, leaves, attendance, salary_slips, holidays = _cards(now)
	if _use_demo(employees):
		return _demo(now, months)
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
		"insights": _insights(now, months),
		"celebrations": _celebrations(now),
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
