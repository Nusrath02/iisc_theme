// Shift & Attendance module dashboard  (server: module_dashboards/shift_attendance.py)
iiscModules.register({
	workspace: "Shift & Attendance",
	dashboard: "Attendance",
	method: "iisc_theme.module_dashboards.shift_attendance.get_dashboard",
	title: __("Shift & Attendance"),
	dashboardTitle: __("Attendance Analytics"),
	subtitle: __("Today's presence, punctuality and shift coverage"),
	actions: [
		{ doctype: "Attendance", label: __("Mark Attendance"), icon: "check", primary: true },
		{ doctype: "Shift Assignment", label: __("Assign Shift"), icon: "clock" },
		{ doctype: "Attendance Request", label: __("Attendance Request"), icon: "file" },
	],

	layout(d, h, m) {
		const k = d.kpis || {};
		const today = frappe.datetime.get_today();
		const kpis = [
			h.kpi({ label: __("Present Today"), icon: "check", tone: "t-teal", value: k.present, chip: k.present_pct !== null && k.present_pct !== undefined ? `${k.present_pct}%` : null,
				list: "Attendance", filters: { attendance_date: today, status: ["in", ["Present", "Work From Home", "Half Day"]] },
				subs: [{ value: k.absent, label: __("Absent"), tone: "x-red" }, { value: k.on_leave, label: __("On Leave"), tone: "x-blue" }, { value: k.unmarked, label: __("Unmarked") }] }),
			h.kpi({ label: __("Late Entries"), icon: "clock", tone: "t-orange", value: k.late, chip: __("Today"), chipTone: "c-orange",
				list: "Attendance", filters: { attendance_date: today, late_entry: 1 }, foot: `<span>${__("Early exits")}</span><b>${h.num(k.early)}</b>` }),
			h.kpi({ label: __("Awaiting Approval"), icon: "inbox", tone: "t-blue", value: k.pending, list: "Attendance Request", filters: { docstatus: 0 },
				chip: k.pending ? __("Action needed") : __("All clear"), chipTone: k.pending ? "c-orange" : "c-teal", foot: `<span>${__("Attendance & shift requests")}</span>` }),
			h.kpi({ label: __("Check-ins Today"), icon: "users", tone: "t-teal", value: k.checkins_today, list: "Employee Checkin",
				foot: `<span>${__("Biometric / app punches")}</span>` }),
		].join("");
		return `
			<section class="iisc-kpis iisc-kpis-4">${kpis}</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Attendance — Last 14 Days"), __("Present, on leave and absent each day"), h.chartSlot("trend"))}
				${h.card(__("Today's Status"), __("All attendance marked today"), h.chartSlot("today"))}
			</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Monthly Attendance Rate"), __("Present share of all attendance records"), h.chartSlot("rate"), `<span class="iisc-card-meta">${__("Last {0} months", [m.months])}</span>`)}
				${h.card(__("Shift Coverage"), __("Active shift assignments by shift type"), h.chartSlot("shifts"))}
			</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Late Entries — Last 14 Days"), __("Punctuality trend"), h.chartSlot("late"))}
				<div class="iisc-mod-ops">${h.card(__("Latest Check-ins"), __("Today"), h.rows(d.checkins, __("No check-ins recorded today.")))}</div>
			</section>
			<section class="iisc-row iisc-row-bottom iisc-mod-ops">
				<div class="iisc-card">
					<div class="iisc-card-head iisc-pad-x"><div><h3 class="iisc-card-title">${__("Pending Requests")}</h3>
					<p class="iisc-card-sub">${__("Attendance regularisation and shift change requests")}</p></div>
					<span class="iisc-pill">${__("{0} awaiting", [d.pending_total || 0])}</span></div>
					${m.pendingTable(d.pending, d.pending_total, "Attendance Request", { docstatus: 0 })}
				</div>
				${m.linksCard("Shift & Attendance")}
			</section>`;
	},

	charts(root, d, m) {
		const c = d.charts || {};
		m.draw(root, "trend", c.trend, { type: "bar", stacked: true, colors: ["#108896", "#006699", "#ee5030"], empty: __("No attendance in the last 14 days.") });
		m.draw(root, "today", c.today, { type: "donut", empty: __("No attendance marked today yet.") });
		m.draw(root, "rate", c.rate, { type: "line", colors: ["#108896"], empty: __("No attendance in this period.") });
		m.draw(root, "shifts", c.shifts, { type: "hbar", empty: __("No active shift assignments.") });
		m.draw(root, "late", c.late, { type: "bar", colors: ["#ee5030"], empty: __("No late entries in the last 14 days.") });
	},
});
