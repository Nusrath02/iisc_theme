// Tax & Benefits module dashboard  (server: module_dashboards/tax_benefits.py)
iiscModules.register({
	workspace: "Tax & Benefits",
	method: "iisc_theme.module_dashboards.tax_benefits.get_dashboard",
	title: __("Tax & Benefits"),
	subtitle: __("Exemption declarations, proofs and benefit claims"),
	actions: [
		{ doctype: "Employee Tax Exemption Declaration", label: __("Declaration"), icon: "plus", primary: true },
		{ doctype: "Employee Tax Exemption Proof Submission", label: __("Proof Submission"), icon: "file" },
		{ doctype: "Employee Benefit Claim", label: __("Benefit Claim"), icon: "inbox" },
	],

	layout(d, h, m) {
		const k = d.kpis || {};
		const cur = d.currency;
		const p = d.period;
		const fmt = (v) => (v === null || v === undefined ? null : format_currency(v, cur, 0));
		const kpis = [
			h.kpi({ label: __("Declarations"), icon: "file", tone: "t-teal", value: k.declarations, chip: p ? p.name : null, list: "Employee Tax Exemption Declaration",
				foot: `<span>${__("Staff covered")}</span><b>${k.declared_pct !== null && k.declared_pct !== undefined ? `${k.declared_pct}%` : "—"}</b>` }),
			h.kpi({ label: __("Declared Amount"), icon: "pie", tone: "t-blue", value: fmt(k.declared_amount), list: "Employee Tax Exemption Declaration",
				foot: `<span>${__("Exemption allowed")}</span><b>${h.money(k.exemption, cur)}</b>` }),
			h.kpi({ label: __("Proof Submissions"), icon: "inbox", tone: "t-orange", value: k.proofs, list: "Employee Tax Exemption Proof Submission",
				chip: k.proofs_draft ? __("{0} in draft", [k.proofs_draft]) : null, chipTone: "c-orange", foot: `<span>${__("Current payroll period")}</span>` }),
			h.kpi({ label: __("Benefit Claims"), icon: "check", tone: "t-teal", value: fmt(k.benefit_claims), list: "Employee Benefit Claim",
				foot: `<span>${__("Benefit applications")}</span><b>${h.num(k.benefit_apps)}</b>` }),
		].join("");
		return `
			<section class="iisc-kpis iisc-kpis-4">${kpis}</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Declared by Exemption Category"), p ? __("Payroll period {0}", [p.name]) : __("Current payroll period"), h.chartSlot("categories"))}
				${h.card(__("Declaration Status"), __("Share of active staff"), h.chartSlot("declaration_status"))}
			</section>
			<section class="iisc-row iisc-row-chart">
				${h.card(__("Proofs Submitted"), __("Per month"), h.chartSlot("proofs"), `<span class="iisc-card-meta">${__("Last {0} months", [m.months])}</span>`)}
				${h.card(__("Benefit Claims by Component"), __("Claimed amount"), h.chartSlot("benefits"))}
			</section>
			<section class="iisc-row iisc-row-bottom iisc-mod-ops">
				${h.card(__("Proofs Still in Draft"), __("Follow up before the year-end deadline"), h.rows(d.pending, __("No draft proof submissions.")))}
				${m.linksCard("Tax & Benefits")}
			</section>`;
	},

	charts(root, d, m) {
		const c = d.charts || {};
		m.draw(root, "categories", c.categories, { type: "hbar", money: true, empty: __("No declarations in this payroll period yet.") });
		m.draw(root, "declaration_status", c.declaration_status, { type: "donut", colors: ["#108896", "#e0912f", "#9aa9b5"], empty: __("No active staff yet.") });
		m.draw(root, "proofs", c.proofs, { type: "bar", colors: ["#1b374c"], empty: __("No proofs submitted in this period.") });
		m.draw(root, "benefits", c.benefits, { type: "pie", money: true, empty: __("No benefit claims in this period.") });
	},
});
