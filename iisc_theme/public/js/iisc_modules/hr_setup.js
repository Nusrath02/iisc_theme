// HR Setup module dashboard  (server: module_dashboards/hr_setup.py)
iiscModules.register({
	workspace: "HR Setup",
	dashboard: "Human Resource",
	method: "iisc_theme.module_dashboards.hr_setup.get_dashboard",
	title: __("People & Organisation"),
	dashboardTitle: __("Human Resource Analytics"),
	subtitle: __("Headcount, structure and workforce mix across IISc"),
	actions: [
		{ doctype: "Employee", label: __("Add Employee"), icon: "plus", primary: true },
		{ doctype: "Department", label: __("Department"), icon: "grid" },
		{ doctype: "Designation", label: __("Designation"), icon: "file" },
	],

	layout(d, h, m) {
		const k = d.kpis || {};
		const kpis = [
			h.kpi({ label: __("Active Staff"), icon: "users", tone: "t-teal", value: k.headcount, chip: k.joined_month ? `+${k.joined_month} ${__("this month")}` : null, list: "Employee", filters: { status: "Active" },
				foot: `<span>${__("Departments")}</span><b>${h.num(k.departments)}</b>` }),
			h.kpi({ label: __("Designations"), icon: "file", tone: "t-blue", value: k.designations, list: "Designation",
				foot: `<span>${__("In use by active staff")}</span>` }),
			h.kpi({ label: __("Exits This Year"), icon: "arrow", tone: "t-orange", value: k.exits_year, list: "Employee", filters: { status: "Left" },
				chip: k.attrition !== null && k.attrition !== undefined ? `${k.attrition}% ${__("attrition")}` : null, chipTone: "c-orange" }),
			h.kpi({ label: __("Joined This Month"), icon: "plus", tone: "t-teal", value: k.joined_month, list: "Employee",
				foot: `<span>${__("New staff onboarded")}</span>` }),
		].join("");
		return `
			<section class="iisc-kpis iisc-kpis-4">${kpis}</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Headcount by Department"), __("Active staff in each department / centre"), h.chartSlot("departments"))}
				${h.card(__("Workforce Mix"), __("Active staff by employment type"), h.chartSlot("workforce"))}
			</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Joiners vs Relieved"), __("Staff movement each month"), h.chartSlot("movement"), `<span class="iisc-card-meta">${__("Last {0} months", [m.months])}</span>`)}
				${h.card(__("Gender Mix"), __("Active staff"), h.chartSlot("gender"))}
			</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Years of Service"), __("Active staff by tenure band"), h.chartSlot("tenure"))}
				<div class="iisc-mod-ops">${h.card(__("Recent Joiners"), __("Last 60 days"), h.rows(d.recent, __("No new joiners in the last 60 days.")))}</div>
			</section>
			<section class="iisc-row iisc-row-bottom iisc-mod-ops">${m.linksCard("HR Setup")}</section>`;
	},

	charts(root, d, m) {
		const c = d.charts || {};
		m.draw(root, "departments", c.departments, { type: "hbar", empty: __("Add employees with a department to see headcount.") });
		m.draw(root, "workforce", c.workforce, { type: "donut", empty: __("Add active employees to see the mix.") });
		m.draw(root, "movement", c.movement, { type: "bar", colors: ["#108896", "#ee5030"], empty: __("No joiners or exits in this period.") });
		m.draw(root, "gender", c.gender, { type: "pie", empty: __("Add active employees to see the mix.") });
		m.draw(root, "tenure", c.tenure, { type: "bar", colors: ["#1b374c"], name: __("Staff"), empty: __("Add joining dates to see service bands.") });
	},
});
