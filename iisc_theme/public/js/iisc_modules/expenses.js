// Expenses module dashboard  (server: module_dashboards/expenses.py)
iiscModules.register({
	workspace: "Expenses",
	dashboard: "Expense Claims",
	method: "iisc_theme.module_dashboards.expenses.get_dashboard",
	title: __("Expenses & Advances"),
	dashboardTitle: __("Expense Claims Analytics"),
	subtitle: __("Claims, reimbursements and outstanding advances"),
	actions: [
		{ doctype: "Expense Claim", label: __("Expense Claim"), icon: "plus", primary: true },
		{ doctype: "Employee Advance", label: __("Employee Advance"), icon: "file" },
	],

	layout(d, h, m) {
		const k = d.kpis || {};
		const cur = d.currency;
		const kpis = [
			h.kpi({ label: __("Claimed This Year"), icon: "file", tone: "t-teal", value: k.claimed === null || k.claimed === undefined ? null : format_currency(k.claimed, cur, 0),
				list: "Expense Claim", foot: `<span>${__("Claims")}</span><b>${h.num(k.claims)}</b>` }),
			h.kpi({ label: __("Sanctioned"), icon: "check", tone: "t-blue", value: k.sanctioned === null || k.sanctioned === undefined ? null : format_currency(k.sanctioned, cur, 0),
				list: "Expense Claim", filters: { approval_status: "Approved" }, foot: `<span>${__("Reimbursed")}</span><b>${h.money(k.reimbursed, cur)}</b>` }),
			h.kpi({ label: __("Awaiting Approval"), icon: "clock", tone: "t-orange", value: k.pending, chip: k.pending ? __("Action needed") : __("All clear"), chipTone: k.pending ? "c-orange" : "c-teal",
				list: "Expense Claim", filters: { approval_status: "Draft", docstatus: 0 }, foot: `<span>${__("Amount")}</span><b>${h.money(k.pending_amount, cur)}</b>` }),
			h.kpi({ label: __("Advances Outstanding"), icon: "inbox", tone: "t-teal", value: k.advances === null || k.advances === undefined ? null : format_currency(k.advances, cur, 0),
				list: "Employee Advance", foot: `<span>${__("Open advances")}</span><b>${h.num(k.advances_count)}</b>` }),
		].join("");
		return `
			<section class="iisc-kpis iisc-kpis-4">${kpis}</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Claimed vs Sanctioned"), __("Monthly claim value"), h.chartSlot("monthly"), `<span class="iisc-card-meta">${__("Last {0} months", [m.months])}</span>`)}
				${h.card(__("Spend by Expense Type"), __("This year"), h.chartSlot("by_type"))}
			</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Spend by Department"), __("Claimed amount this year"), h.chartSlot("departments"))}
				${h.card(__("Claim Status"), __("This year"), h.chartSlot("status"))}
			</section>
			<section class="iisc-row iisc-row-bottom iisc-mod-ops">
				<div class="iisc-card">
					<div class="iisc-card-head iisc-pad-x"><div><h3 class="iisc-card-title">${__("Pending Claims")}</h3>
					<p class="iisc-card-sub">${__("Claims waiting for approval")}</p></div>
					<span class="iisc-pill">${__("{0} awaiting", [d.pending_total || 0])}</span></div>
					${m.pendingTable(d.pending, d.pending_total, "Expense Claim", { approval_status: "Draft", docstatus: 0 })}
				</div>
				${h.card(__("Outstanding Advances"), __("Paid but not yet settled"), h.rows(d.advances, __("No outstanding advances.")))}
			</section>
			<section class="iisc-row iisc-row-bottom iisc-mod-ops">${m.linksCard("Expenses")}</section>`;
	},

	charts(root, d, m) {
		const c = d.charts || {};
		m.draw(root, "monthly", c.monthly, { type: "bar", colors: ["#1b374c", "#108896"], money: true, empty: __("No claims in this period.") });
		m.draw(root, "by_type", c.by_type, { type: "donut", empty: __("No claims this year yet.") });
		m.draw(root, "departments", c.departments, { type: "hbar", money: true, empty: __("No claims this year yet.") });
		m.draw(root, "status", c.status, { type: "pie", colors: ["#108896", "#e0912f", "#ee5030", "#1b374c"], empty: __("No claims this year yet.") });
	},
});
