// Tenure (employee lifecycle) module dashboard  (server: module_dashboards/tenure.py)
iiscModules.register({
	workspace: "Tenure",
	dashboard: "Employee Lifecycle",
	method: "iisc_theme.module_dashboards.tenure.get_dashboard",
	title: __("Employee Lifecycle"),
	dashboardTitle: __("Employee Lifecycle Analytics"),
	subtitle: __("Onboarding, promotions, transfers and exits"),
	actions: [
		{ doctype: "Employee Onboarding", label: __("Onboarding"), icon: "plus", primary: true },
		{ doctype: "Employee Promotion", label: __("Promotion"), icon: "arrow" },
		{ doctype: "Employee Separation", label: __("Separation"), icon: "file" },
	],

	layout(d, h, m) {
		const k = d.kpis || {};
		const open = { boarding_status: ["in", ["Pending", "In Process"]] };
		const kpis = [
			h.kpi({ label: __("Onboarding"), icon: "plus", tone: "t-teal", value: k.onboarding, chip: __("In progress"), list: "Employee Onboarding", filters: open,
				foot: `<span>${__("New staff being set up")}</span>` }),
			h.kpi({ label: __("Separations"), icon: "arrow", tone: "t-orange", value: k.separation, chip: __("In progress"), chipTone: "c-orange", list: "Employee Separation", filters: open,
				foot: `<span>${__("Exit formalities open")}</span>` }),
			h.kpi({ label: __("Promotions"), icon: "check", tone: "t-blue", value: k.promotions, chip: __("This Year"), chipTone: "c-blue", list: "Employee Promotion",
				foot: `<span>${__("Transfers this year")}</span><b>${h.num(k.transfers)}</b>` }),
			h.kpi({ label: __("Average Tenure"), icon: "calendar", tone: "t-teal", value: k.avg_tenure === null || k.avg_tenure === undefined ? null : `${k.avg_tenure} ${__("yrs")}`,
				list: "Employee", filters: { status: "Active" }, foot: `<span>${__("Active staff")}</span>` }),
		].join("");
		return `
			<section class="iisc-kpis iisc-kpis-4">${kpis}</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Joiners vs Relieved"), __("Staff movement each month"), h.chartSlot("movement"), `<span class="iisc-card-meta">${__("Last {0} months", [m.months])}</span>`)}
				${h.card(__("Years of Service"), __("Active staff by tenure band"), h.chartSlot("tenure"))}
			</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Promotions & Transfers"), __("Career moves each month"), h.chartSlot("changes"))}
				${h.card(__("Reasons for Leaving"), __("Exits this year"), h.chartSlot("exit_reasons"))}
			</section>
			<section class="iisc-row iisc-row-bottom iisc-mod-ops">
				${h.card(__("Onboarding in Progress"), __("Pending and in-process onboardings"), h.rows(d.onboarding, __("No onboarding in progress.")))}
				${h.card(__("Separations in Progress"), __("Pending and in-process exits"), h.rows(d.separation, __("No separations in progress.")))}
			</section>
			<section class="iisc-row iisc-row-bottom iisc-mod-ops">${m.linksCard("Tenure")}</section>`;
	},

	charts(root, d, m) {
		const c = d.charts || {};
		m.draw(root, "movement", c.movement, { type: "bar", colors: ["#108896", "#ee5030"], empty: __("No joiners or exits in this period.") });
		m.draw(root, "tenure", c.tenure, { type: "bar", colors: ["#1b374c"], name: __("Staff"), empty: __("Add joining dates to see service bands.") });
		m.draw(root, "changes", c.changes, { type: "bar", colors: ["#006699", "#e0912f"], empty: __("No promotions or transfers in this period.") });
		m.draw(root, "exit_reasons", c.exit_reasons, { type: "donut", empty: __("No exits recorded this year.") });
	},
});
