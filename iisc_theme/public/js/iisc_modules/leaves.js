// =====================================================================
// Leaves module dashboard  (server: iisc_theme/module_dashboards/leaves.py)
// =====================================================================

iiscModules.register({
	workspace: "Leaves",
	method: "iisc_theme.module_dashboards.leaves.get_dashboard",
	title: __("Leave Management"),
	subtitle: __("Applications, balances and who is away across IISc"),
	actions: [
		{ doctype: "Leave Application", label: __("Leave Application"), icon: "plus", primary: true },
		{ doctype: "Leave Allocation", label: __("Allocate Leave"), icon: "calendar" },
		{ doctype: "Leave Policy Assignment", label: __("Assign Policy"), icon: "file" },
	],

	layout(d, h, m) {
		const k = d.kpis || {};
		const apps = k.apps || {};
		const days = k.days || {};
		const LA = "Leave Application";
		const today = frappe.datetime.get_today();

		const kpis = [
			h.kpi({
				label: __("Applications"), icon: "inbox", tone: "t-teal", value: apps.total,
				chip: __("This Year"), chipTone: "c-teal", list: LA,
				subs: [
					{ value: apps.open, label: __("Open"), tone: "x-orange" },
					{ value: apps.approved, label: __("Approved"), tone: "x-teal" },
					{ value: apps.rejected, label: __("Rejected"), tone: "x-red" },
				],
			}),
			h.kpi({
				label: __("On Leave Today"), icon: "plane", tone: "t-blue", value: k.on_leave_today,
				chipTone: "c-blue", list: LA,
				filters: { status: "Approved", from_date: ["<=", today], to_date: [">=", today] },
				foot: `<span>${__("Next 7 days")}</span><span class="iisc-chip c-navy">${h.num(k.upcoming_week)} ${__("starting")}</span>`,
			}),
			h.kpi({
				label: __("Awaiting Approval"), icon: "clock", tone: "t-orange", value: k.pending,
				chip: k.pending ? __("Action needed") : __("All clear"), chipTone: k.pending ? "c-orange" : "c-teal",
				list: LA, filters: { status: "Open" },
				foot: `<span>${__("Approve from the queue below")}</span>`,
			}),
			h.kpi({
				label: __("Days Taken"), icon: "pie", tone: "t-teal", value: days.taken,
				chip: days.utilisation !== null && days.utilisation !== undefined ? `${days.utilisation}% ${__("used")}` : null,
				chipTone: "c-teal", list: LA, filters: { status: "Approved" },
				foot: `<span>${__("Allocated this year")}</span><b>${h.num(days.allocated)}</b>`,
			}),
		].join("");

		const away = (d.on_leave || []).length
			? (d.on_leave || [])
					.map(
						(r) => `
					<div class="iisc-celebrate" data-open="${LA}" data-name="${h.esc(r.name || "")}" role="button" tabindex="0">
						<span class="iisc-emp-avatar">${h.esc(h.initials(r.employee_name))}</span>
						<span class="iisc-hol-text"><b>${h.esc(r.employee_name)}</b>
							<small>${h.esc(__(r.leave_type))}${r.department ? ` • ${h.esc(r.department)}` : ""}</small></span>
						<span class="iisc-chip ${moment(r.from_date).isAfter(moment(), "day") ? "c-gray" : "c-blue"}">
							${moment(r.from_date).isAfter(moment(), "day")
								? `${__("From")} ${h.esc(moment(r.from_date).format("MMM D"))}`
								: `${__("Back in")} ${h.esc(r.back_in)}d`}
						</span>
					</div>`
					)
					.join("")
			: `<div class="iisc-empty">${__("Nobody is on leave this week.")}</div>`;

		return `
			<section class="iisc-kpis iisc-kpis-4">${kpis}</section>

			<section class="iisc-row iisc-row-chart">
				${h.card(__("Applications per Month"), __("Approved, open and rejected requests by start date"), h.chartSlot("monthly"),
					`<span class="iisc-card-meta">${__("Last {0} months", [m.months])}</span>`)}
				${h.card(__("Days by Leave Type"), __("Approved leave days this year"), h.chartSlot("by_type"))}
			</section>

			<section class="iisc-row iisc-row-chart">
				${h.card(__("Allocated vs Used"), __("Balance utilisation by leave type this year"), h.chartSlot("alloc_vs_used"))}
				${h.card(__("Who's Away This Week"), __("Approved leave overlapping the next 7 days"), away)}
			</section>

			<section class="iisc-row iisc-row-bottom iisc-mod-ops">
				<div class="iisc-card">
					<div class="iisc-card-head iisc-pad-x">
						<div><h3 class="iisc-card-title">${__("Pending Leave Approvals")}</h3>
						<p class="iisc-card-sub">${__("Open applications waiting for a decision")}</p></div>
						<span class="iisc-pill">${__("{0} awaiting", [d.pending_total || 0])}</span>
					</div>
					${m.pendingTable(d.pending, d.pending_total, LA)}
				</div>
				${m.linksCard("Leaves")}
			</section>`;
	},

	charts(root, d, m) {
		const c = d.charts || {};
		m.draw(root, "monthly", c.monthly, {
			type: "bar", stacked: true, colors: ["#108896", "#e0912f", "#ee5030"],
			empty: __("No leave applications in this period yet."),
		});
		m.draw(root, "by_type", c.by_type, { type: "donut", name: __("Days"), empty: __("No approved leave this year yet.") });
		m.draw(root, "alloc_vs_used", c.alloc_vs_used, {
			type: "bar", colors: ["#1b374c", "#108896"],
			empty: __("Allocate leave to see utilisation here."),
		});
	},
});
