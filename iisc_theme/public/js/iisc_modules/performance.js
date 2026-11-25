// Performance module dashboard  (server: module_dashboards/performance.py)
iiscModules.register({
	workspace: "Performance",
	method: "iisc_theme.module_dashboards.performance.get_dashboard",
	title: __("Performance"),
	subtitle: __("Appraisal cycle progress, scores and goals"),
	actions: [
		{ doctype: "Appraisal", label: __("Appraisal"), icon: "plus", primary: true },
		{ doctype: "Goal", label: __("Goal"), icon: "check" },
		{ doctype: "Employee Performance Feedback", label: __("Feedback"), icon: "file" },
	],

	layout(d, h, m) {
		const k = d.kpis || {};
		const cy = d.cycle;
		const kpis = [
			h.kpi({ label: __("Appraisals"), icon: "file", tone: "t-teal", value: k.appraisals, chip: cy ? cy.title : null, list: "Appraisal",
				subs: [{ value: k.submitted, label: __("Submitted"), tone: "x-teal" }, { value: k.draft, label: __("Draft"), tone: "x-orange" }, { value: k.cycles_active, label: __("Active cycles") }] }),
			h.kpi({ label: __("Average Score"), icon: "pie", tone: "t-blue", value: k.avg_score, chip: __("out of 5"), chipTone: "c-blue", list: "Appraisal",
				foot: `<span>${__("Final score, current cycle")}</span>` }),
			h.kpi({ label: __("Goals"), icon: "check", tone: "t-teal", value: k.goals, list: "Goal",
				chip: k.goal_progress !== null && k.goal_progress !== undefined ? `${k.goal_progress}% ${__("avg progress")}` : null,
				foot: `<span>${__("Completed")}</span><b>${h.num(k.goals_done)}</b>` }),
			h.kpi({ label: __("Cycle Ends"), icon: "calendar", tone: "t-orange", value: cy && cy.end ? moment(cy.end).format("MMM D") : null, list: "Appraisal Cycle",
				chip: cy && cy.end ? __("{0} days left", [Math.max(moment(cy.end).diff(moment(), "days"), 0)]) : null, chipTone: "c-orange", foot: `<span>${h.esc(cy ? cy.status : __("No cycle yet"))}</span>` }),
		].join("");
		return `
			<section class="iisc-kpis iisc-kpis-4">${kpis}</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Score Distribution"), __("Final appraisal scores, current cycle"), h.chartSlot("scores"))}
				${h.card(__("Appraisal Progress"), __("Submitted vs draft"), h.chartSlot("appraisal_status"))}
			</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Feedback Given"), __("Performance feedback submitted per month"), h.chartSlot("feedback"), `<span class="iisc-card-meta">${__("Last {0} months", [m.months])}</span>`)}
				${h.card(__("Goal Status"), __("Current cycle"), h.chartSlot("goal_status"))}
			</section>
			<section class="iisc-row iisc-row-bottom iisc-mod-ops">
				${h.card(__("Appraisals Still in Draft"), __("Follow up to close the cycle"), h.rows(d.pending, __("Every appraisal is submitted.")))}
				${h.card(__("Appraisal Cycles"), __("Latest cycles"), h.rows(d.cycles, __("No appraisal cycles yet.")))}
			</section>
			<section class="iisc-row iisc-row-bottom iisc-mod-ops">${m.linksCard("Performance")}</section>`;
	},

	charts(root, d, m) {
		const c = d.charts || {};
		m.draw(root, "scores", c.scores, { type: "bar", colors: ["#1b374c"], name: __("Employees"), empty: __("No scored appraisals yet.") });
		m.draw(root, "appraisal_status", c.appraisal_status, { type: "donut", colors: ["#108896", "#e0912f"], empty: __("No appraisals in this cycle yet.") });
		m.draw(root, "feedback", c.feedback, { type: "line", colors: ["#108896"], empty: __("No feedback in this period.") });
		m.draw(root, "goal_status", c.goal_status, { type: "pie", empty: __("No goals in this cycle yet.") });
	},
});
