import frappe
from frappe.utils import add_months, get_first_day, get_last_day, getdate, today


def _count(doctype, filters):
	"""Count documents the current user is allowed to read (None = no access)."""
	if not frappe.db.exists("DocType", doctype) or not frappe.has_permission(doctype, "read"):
		return None
	return len(frappe.get_list(doctype, filters=filters, pluck="name", limit_page_length=0))


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

	slip_month = {"start_date": month}
	salary_slips = {
		"total": _count("Salary Slip", {**slip_month, "docstatus": ["!=", 2]}),
		"draft": _count("Salary Slip", {**slip_month, "docstatus": 0}),
		"submitted": _count("Salary Slip", {**slip_month, "docstatus": 1}),
		"cancelled": _count("Salary Slip", {**slip_month, "docstatus": 2}),
	}

	holidays = {"upcoming": None, "this_month": None, "holiday_list": None}
	company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value(
		"Global Defaults", "default_company"
	)
	if company and frappe.has_permission("Holiday List", "read"):
		holiday_list = frappe.db.get_value("Company", company, "default_holiday_list")
		if holiday_list:
			base = {"parent": holiday_list, "parenttype": "Holiday List", "weekly_off": 0}
			holidays = {
				"holiday_list": holiday_list,
				"upcoming": frappe.db.count("Holiday", {**base, "holiday_date": ["between", [now, year_end]]}),
				"this_month": frappe.db.count("Holiday", {**base, "holiday_date": month}),
			}

	return employees, leaves, attendance, salary_slips, holidays


# (label, doctype, "approved" filter) — totals exclude cancelled documents
OVERVIEW = [
	("Leave Applications", "Leave Application", {"status": "Approved"}),
	("Expense Claims", "Expense Claim", {"approval_status": "Approved"}),
	("Attendance Requests", "Attendance Request", {"docstatus": 1}),
	("Shift Requests", "Shift Request", {"status": "Approved"}),
]

# (label, doctype, date field) — monthly request counts for the chart
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
	labels, datasets = [], []
	starts = [get_first_day(add_months(now, -i)) for i in range(months - 1, -1, -1)]
	labels = [d.strftime("%b %Y") for d in starts]
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
	return {"labels": labels, "datasets": datasets}


@frappe.whitelist()
def get_hr_dashboard(months=6):
	"""Numbers for the IISc HR home on the Desk Apps screen."""
	months = 12 if str(months) == "12" else 6
	now = getdate(today())
	employees, leaves, attendance, salary_slips, holidays = _cards(now)
	return {
		"employees": employees,
		"leaves": leaves,
		"attendance": attendance,
		"salary_slips": salary_slips,
		"holidays": holidays,
		"overview": _overview(),
		"series": _series(now, months),
		"today": str(now),
	}
