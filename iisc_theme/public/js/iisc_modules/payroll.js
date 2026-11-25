// Payroll module dashboard  (server: module_dashboards/payroll.py)
iiscModules.register({
	workspace: "Payroll",
	dashboard: "Payroll",
	method: "iisc_theme.module_dashboards.payroll.get_dashboard",
	title: __("Payroll"),
	dashboardTitle: __("Payroll Analytics"),
	subtitle: __("Salary cost, slips and payroll runs"),
	actions: [
		{ doctype: "Payroll Entry", label: __("Payroll Entry"), icon: "plus", primary: true },
		{ doctype: "Salary Structure Assignment", label: __("Assign Structure"), icon: "file" },
		{ doctype: "Additional Salary", label: __("Additional Salary"), icon: "inbox" },
	],

	layout(d, h, m) {
		const k = d.kpis || {};
		const cur = d.currency;
		const fmt = (v) => (v === null || v === undefined ? null : format_currency(v, cur, 0));
		const kpis = [
			h.kpi({ label: __("Gross Pay"), icon: "file", tone: "t-teal", value: fmt(k.gross), chip: k.month_label, list: "Salary Slip", filters: { docstatus: 1 },
				foot: `<span>${__("Deductions")}</span><b>${h.money(k.deductions, cur)}</b>` }),
			h.kpi({ label: __("Net Pay"), icon: "check", tone: "t-blue", value: fmt(k.net), chip: k.month_label, chipTone: "c-blue", list: "Salary Slip", filters: { docstatus: 1 },
				foot: `<span>${__("Paid to staff this month")}</span>` }),
			h.kpi({ label: __("Salary Slips"), icon: "inbox", tone: "t-orange", value: k.slips, chip: k.month_label, chipTone: "c-orange", list: "Salary Slip",
				subs: [{ value: k.slips_draft, label: __("Draft"), tone: "x-orange" }, { value: k.slips_submitted, label: __("Submitted"), tone: "x-teal" }, { value: k.active, label: __("Staff") }] }),
			h.kpi({ label: __("No Salary Structure"), icon: "users", tone: "t-orange", value: k.no_structure, list: "Salary Structure Assignment",
				chip: k.no_structure ? __("Fix before payroll") : __("All assigned"), chipTone: k.no_structure ? "c-orange" : "c-teal", foot: `<span>${__("Active staff without an assignment")}</span>` }),
		].join("");
		return `
			<section class="iisc-kpis iisc-kpis-4">${kpis}</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Gross vs Net Pay"), __("Submitted salary slips by month"), h.chartSlot("monthly"), `<span class="iisc-card-meta">${__("Last {0} months", [m.months])}</span>`)}
				${h.card(__("Earnings by Component"), __("Latest payroll month"), h.chartSlot("components"))}
			</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Payroll Cost by Department"), __("Gross pay in the selected period"), h.chartSlot("departments"))}
				${h.card(__("Deductions Trend"), __("Tax, PF and other deductions"), h.chartSlot("deductions"))}
			</section>
			<section class="iisc-row iisc-row-bottom iisc-mod-ops">
				${h.card(__("Recent Payroll Runs"), __("Latest payroll entries"), h.rows(d.entries, __("No payroll entries yet.")))}
				${m.linksCard("Payroll")}
			</section>`;
	},

	charts(root, d, m) {
		const c = d.charts || {};
		m.draw(root, "monthly", c.monthly, { type: "bar", colors: ["#1b374c", "#108896"], money: true, empty: __("No submitted salary slips in this period.") });
		m.draw(root, "components", c.components, { type: "donut", empty: __("No submitted salary slips yet.") });
		m.draw(root, "departments", c.departments, { type: "hbar", money: true, empty: __("No submitted salary slips in this period.") });
		m.draw(root, "deductions", c.deductions, { type: "line", colors: ["#ee5030"], money: true, empty: __("No deductions in this period.") });
	},
});
