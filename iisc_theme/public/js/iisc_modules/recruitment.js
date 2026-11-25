// Recruitment module dashboard  (server: module_dashboards/recruitment.py)
iiscModules.register({
	workspace: "Recruitment",
	dashboard: "Recruitment",
	method: "iisc_theme.module_dashboards.recruitment.get_dashboard",
	title: __("Recruitment"),
	dashboardTitle: __("Recruitment Analytics"),
	subtitle: __("Openings, applicant pipeline and interviews"),
	actions: [
		{ doctype: "Job Opening", label: __("Job Opening"), icon: "plus", primary: true },
		{ doctype: "Job Applicant", label: __("Job Applicant"), icon: "users" },
		{ doctype: "Interview", label: __("Schedule Interview"), icon: "calendar" },
	],

	layout(d, h, m) {
		const k = d.kpis || {};
		const kpis = [
			h.kpi({ label: __("Open Positions"), icon: "inbox", tone: "t-teal", value: k.openings, list: "Job Opening", filters: { status: "Open" },
				foot: `<span>${__("Planned vacancies")}</span><b>${h.num(k.vacancies)}</b>` }),
			h.kpi({ label: __("Applicants"), icon: "users", tone: "t-blue", value: k.applicants, chip: __("Last {0} months", [m.months]), chipTone: "c-blue", list: "Job Applicant",
				foot: `<span>${__("Shortlisted")}</span><b>${h.num(k.shortlisted)}</b>` }),
			h.kpi({ label: __("Interviews"), icon: "calendar", tone: "t-orange", value: k.interviews_week, chip: __("Next 7 days"), chipTone: "c-orange", list: "Interview",
				foot: `<span>${__("Scheduled")}</span>` }),
			h.kpi({ label: __("Offers"), icon: "check", tone: "t-teal", value: k.offers, list: "Job Offer",
				chip: k.offers ? `${Math.round(((k.accepted || 0) * 100) / k.offers)}% ${__("accepted")}` : null, foot: `<span>${__("Accepted")}</span><b>${h.num(k.accepted)}</b>` }),
		].join("");
		return `
			<section class="iisc-kpis iisc-kpis-4">${kpis}</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Hiring Funnel"), __("From application to acceptance"), h.chartSlot("funnel"))}
				${h.card(__("Applicant Sources"), __("Where candidates come from"), h.chartSlot("sources"))}
			</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Applications per Month"), __("New job applicants"), h.chartSlot("monthly"), `<span class="iisc-card-meta">${__("Last {0} months", [m.months])}</span>`)}
				${h.card(__("Vacancies by Department"), __("Open positions"), h.chartSlot("departments"))}
			</section>
			<section class="iisc-row iisc-row-bottom iisc-mod-ops">
				${h.card(__("Upcoming Interviews"), __("Next 7 days"), h.rows(d.interviews, __("No interviews scheduled this week.")))}
				${h.card(__("Open Positions"), __("With applicant counts"), h.rows(d.openings, __("No open positions.")))}
			</section>
			<section class="iisc-row iisc-row-bottom iisc-mod-ops">${m.linksCard("Recruitment")}</section>`;
	},

	charts(root, d, m) {
		const c = d.charts || {};
		m.draw(root, "funnel", c.funnel, { type: "hbar", empty: __("No applicants in this period yet.") });
		m.draw(root, "sources", c.sources, { type: "donut", empty: __("No applicants in this period yet.") });
		m.draw(root, "monthly", c.monthly, { type: "line", colors: ["#108896"], empty: __("No applicants in this period yet.") });
		m.draw(root, "departments", c.departments, { type: "hbar", empty: __("No open positions.") });
	},
});
