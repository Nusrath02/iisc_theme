// =====================================================================
// IISc module dashboards — shared engine
//   iiscModules.register({ workspace, method, ... })  (one per module file)
// Shown by default on the module's Workspace page (/desk/<module>),
// re-mounted on every visit (dock, sidebar, breadcrumbs, back/forward).
// The raw workspace is shown only in workspace Edit mode.
// =====================================================================

const ICONS = {
	plus: '<path d="M12 5v14M5 12h14"/>',
	chevron: '<path d="M6 9l6 6 6-6"/>',
	calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
	users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
	clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
	check: '<path d="M20 6L9 17l-5-5"/>',
	inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
	pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
	plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
	file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
	grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
	arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
	report: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
	settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};

const svg = (name, size = 16) =>
	`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.grid}</svg>`;

const esc = (v) => frappe.utils.escape_html(v === null || v === undefined ? "" : String(v));
const num = (v) => (v === null || v === undefined ? "—" : esc(v));

const PALETTE = ["#1b374c", "#108896", "#ee5030", "#006699", "#5b7f95", "#7cc4cc", "#f4a08d", "#9aa9b5"];

const initials = (name) =>
	(name || "?")
		.split(/\s+/)
		.filter(Boolean)
		.map((p) => p[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

const iiscModules = {
	registry: {},
	months: 6,

	register(cfg) {
		this.registry[cfg.workspace] = cfg;
	},

	// ---------- helpers exposed to module files ----------
	h: {
		svg,
		esc,
		num,
		initials,
		PALETTE,
		when(dt) {
			const m = moment(dt);
			if (m.isSame(moment(), "day")) return `${__("Today")}, ${m.format("h:mm A")}`;
			if (m.isSame(moment().subtract(1, "day"), "day")) return `${__("Yesterday")}, ${m.format("h:mm A")}`;
			return m.format("MMM D, YYYY");
		},
		kpi({ label, icon, tone = "t-teal", value, chip, chipTone = "c-teal", subs, foot, list, filters }) {
			const subsHtml = subs
				? `<div class="iisc-kpi-subs">${subs
						.map((s) => `<div><b class="${s.tone || ""}">${num(s.value)}</b><span>${esc(s.label)}</span></div>`)
						.join("")}</div>`
				: "";
			const link = list ? ` data-list="${esc(list)}" data-filters='${esc(JSON.stringify(filters || {}))}' role="button" tabindex="0"` : "";
			return `
				<div class="iisc-card iisc-kpi"${link}>
					<div class="iisc-kpi-top">
						<span class="iisc-kpi-label">${esc(label)}</span>
						<span class="iisc-kpi-icon ${tone}">${svg(icon)}</span>
					</div>
					<div class="iisc-kpi-value">${num(value)}${chip ? `<span class="iisc-chip ${chipTone}">${esc(chip)}</span>` : ""}</div>
					${subsHtml}${foot ? `<div class="iisc-kpi-foot">${foot}</div>` : ""}
				</div>`;
		},
		card(title, sub, body, meta = "") {
			return `
				<div class="iisc-card iisc-pad">
					<div class="iisc-card-head">
						<div><h3 class="iisc-card-title">${title}</h3>${sub ? `<p class="iisc-card-sub">${sub}</p>` : ""}</div>
						${meta}
					</div>
					${body}
				</div>`;
		},
		chartSlot(key) {
			return `<div class="iisc-chart" data-mod-chart="${key}"></div>`;
		},
		empty(text) {
			return `<div class="iisc-empty iisc-chart-empty">${svg("grid", 22)}<span>${esc(text)}</span></div>`;
		},
		money(v, currency) {
			if (v === null || v === undefined) return "—";
			return esc(format_currency(v, currency || frappe.boot.sysdefaults.currency, 0));
		},
		// Compact list of people/records: [{title, sub, chip, chipTone, initials, doctype, name}]
		rows(items, emptyText) {
			if (!items || !items.length) return `<div class="iisc-empty">${esc(emptyText || __("Nothing to show yet."))}</div>`;
			return items
				.map(
					(r) => `
				<div class="iisc-celebrate" ${r.doctype ? `data-open="${esc(r.doctype)}" data-name="${esc(r.name || "")}" role="button" tabindex="0"` : ""}>
					<span class="iisc-emp-avatar">${esc(r.initials || initials(r.title))}</span>
					<span class="iisc-hol-text"><b>${esc(r.title)}</b><small>${esc(r.sub || "")}</small></span>
					${r.chip !== undefined && r.chip !== null && r.chip !== "" ? `<span class="iisc-chip ${r.chipTone || "c-gray"}">${esc(r.chip)}</span>` : ""}
				</div>`
				)
				.join("");
		},
	},

	// Short Indian-style numbers: 1.2K, 4.9 L, 2.3 Cr
	shortNum(v) {
		const n = Number(v) || 0;
		const a = Math.abs(n);
		const fix = (x) => x.toFixed(1).replace(/\.0$/, "");
		if (a >= 1e7) return `${fix(n / 1e7)} Cr`;
		if (a >= 1e5) return `${fix(n / 1e5)} L`;
		if (a >= 1e3) return `${fix(n / 1e3)}K`;
		return String(Math.round(n * 10) / 10);
	},

	symbol(currency) {
		const cur = currency || frappe.boot.sysdefaults.currency;
		return (window.get_currency_symbol && get_currency_symbol(cur)) || "";
	},

	// Donut / pie drawn as SVG + legend: the total always fits inside the ring
	donut(data, opts = {}) {
		const values = (data.values || []).map((v) => Math.max(Number(v) || 0, 0));
		const labels = data.labels || [];
		const colors = opts.colors || PALETTE;
		const total = values.reduce((a, b) => a + b, 0) || 1;
		const sym = opts.money ? this.symbol(data.currency) : "";
		const show = (v) => `${sym}${this.shortNum(v)}`;
		const r = 54;
		const circ = 2 * Math.PI * r;
		const width = opts.type === "pie" ? 30 : 20;
		let offset = 0;
		const segs = values
			.map((v, i) => {
				const len = (v / total) * circ;
				const seg = `<circle r="${r}" cx="70" cy="70" fill="none" stroke="${colors[i % colors.length]}" stroke-width="${width}"
					stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 70 70)">
					<title>${esc(labels[i])}: ${esc(opts.money ? format_currency(v, data.currency, 0) : v)}</title></circle>`;
				offset += len;
				return seg;
			})
			.join("");
		const legend = labels
			.map(
				(l, i) => `
				<div class="iisc-donut-item" title="${esc(l)}">
					<i style="background:${colors[i % colors.length]}"></i>
					<span class="iisc-donut-label">${esc(l)}</span>
					<b>${esc(show(values[i]))}</b>
					<small>${Math.round((values[i] / total) * 100)}%</small>
				</div>`
			)
			.join("");
		return `
			<div class="iisc-donut">
				<div class="iisc-donut-ring">
					<svg viewBox="0 0 140 140" width="150" height="150" aria-hidden="true">
						<circle r="${r}" cx="70" cy="70" fill="none" stroke="#eef0f3" stroke-width="${width}"></circle>${segs}
					</svg>
					<div class="iisc-donut-center"><b>${esc(show(total))}</b><span>${esc(opts.centerLabel || __("Total"))}</span></div>
				</div>
				<div class="iisc-donut-legend">${legend}</div>
			</div>`;
	},

	// Horizontal bars in HTML (long labels stay readable)
	hbars(data, money) {
		const values = data.values || [];
		const max = Math.max(...values, 1);
		const total = values.reduce((a, b) => a + Number(b || 0), 0) || 1;
		return `<div class="iisc-hbars">${(data.labels || [])
			.map((label, i) => {
				const v = Number(values[i] || 0);
				const shown = money ? this.h.money(v, data.currency) : esc(v);
				return `
				<div class="iisc-hbar" title="${esc(label)}">
					<span class="iisc-hbar-label">${esc(label)}</span>
					<span class="iisc-hbar-track"><span style="width:${Math.max(2, (v / max) * 100)}%"></span></span>
					<span class="iisc-hbar-value"><b>${shown}</b> <small>${Math.round((v / total) * 100)}%</small></span>
				</div>`;
			})
			.join("")}</div>`;
	},

	// ---------- chart drawing (frappe-charts, IISc palette) ----------
	hasData(data) {
		if (!data) return false;
		const sets = data.datasets || (data.values ? [{ values: data.values }] : []);
		return sets.some((ds) => (ds.values || []).some((v) => Number(v) > 0));
	},

	draw(root, key, data, opts) {
		const el = root.querySelector(`[data-mod-chart="${key}"]`);
		if (!el) return;
		if (!this.hasData(data)) {
			el.innerHTML = this.h.empty(opts.empty || __("No data yet."));
			return;
		}
		if (opts.type === "hbar") {
			el.innerHTML = this.hbars(data, opts.money);
			return;
		}
		if (opts.type === "donut" || opts.type === "pie") {
			el.innerHTML = this.donut(data, opts);
			return;
		}
		el.innerHTML = "";
		const round = opts.type === "donut" || opts.type === "pie" || opts.type === "percentage";
		const cfg = {
			data: { labels: data.labels, datasets: data.datasets || [{ name: opts.name || __("Count"), values: data.values }] },
			type: opts.type,
			height: opts.height || (round ? 250 : 260),
			colors: opts.colors || PALETTE,
			axisOptions: { xIsSeries: opts.type === "line", xAxisMode: "tick", yAxisMode: "span", shortenYAxisNumbers: 1 },
		};
		if (opts.type === "line") cfg.lineOptions = { regionFill: 1, dotSize: 5, spline: 1 };
		if (opts.type === "bar") cfg.barOptions = { stacked: opts.stacked ? 1 : 0, spaceRatio: 0.45 };
		if (opts.money) cfg.tooltipOptions = { formatTooltipY: (v) => format_currency(v, data.currency) };
		try {
			new frappe.Chart(el, cfg);
		} catch (e) {
			el.innerHTML = this.h.empty(__("Could not draw this chart."));
		}
	},

	// ---------- shared blocks ----------
	pendingTable(items, total, list, filters = { status: "Open" }) {
		if (!items || !items.length) {
			return `<div class="iisc-empty iisc-pad">${__("You're all caught up — nothing is awaiting approval.")}</div>`;
		}
		const rows = items
			.map(
				(it) => `
				<tr>
					<td><div class="iisc-emp"><span class="iisc-emp-avatar">${esc(initials(it.employee_name))}</span>
						<span><b>${esc(it.employee_name)}</b><small>${esc(it.department || "")}</small></span></div></td>
					<td><span class="iisc-chip ${it.tone || "c-orange"}">${esc(it.type)}</span></td>
					<td class="iisc-q-details">${esc(it.details)}</td>
					<td class="iisc-muted">${esc(this.h.when(it.creation))}</td>
					<td class="iisc-q-actions">
						<button class="iisc-mini iisc-mini-approve" data-act="Approve" data-dt="${esc(it.doctype)}" data-dn="${esc(it.name || "")}">${__("Approve")}</button>
						<button class="iisc-mini" data-act="Reject" data-dt="${esc(it.doctype)}" data-dn="${esc(it.name || "")}">${__("Reject")}</button>
					</td>
				</tr>`
			)
			.join("");
		return `
			<div class="iisc-table-wrap"><table class="iisc-table">
				<thead><tr><th>${__("Employee")}</th><th>${__("Type")}</th><th>${__("Details")}</th><th>${__("Submitted")}</th><th class="text-right">${__("Actions")}</th></tr></thead>
				<tbody>${rows}</tbody>
			</table></div>
			<button class="iisc-table-foot" data-list="${esc(list)}" data-filters='${esc(JSON.stringify(filters))}'>
				${__("View all {0} pending", [total || items.length])} ${svg("arrow", 14)}
			</button>`;
	},

	// Links card built from the module's own v16 sidebar (sections → groups)
	linksCard(workspace) {
		const sb = (frappe.boot.module_sidebars || {})[workspace];
		const groups = [];
		let current = { label: __("Documents"), items: [] };
		((sb && sb.items) || []).forEach((i) => {
			if (i.type === "Section Break") {
				if (current.items.length) groups.push(current);
				current = { label: i.label, items: [] };
			} else if (i.type === "Link" && i.link_type !== "Workspace" && i.link_to) {
				current.items.push(i);
			}
		});
		if (current.items.length) groups.push(current);
		if (!groups.length) return "";
		const body = groups
			.map(
				(g) => `
				<div class="iisc-links-group">
					<span class="iisc-links-label">${esc(__(g.label))}</span>
					<div class="iisc-links">${g.items
						.map(
							(i) => `<button class="iisc-link-chip" data-link-type="${esc(i.link_type)}" data-link-to="${esc(i.link_to)}">
								${svg(i.link_type === "Report" ? "report" : i.link_type === "DocType" && /Settings/.test(i.link_to) ? "settings" : "file", 14)}
								${esc(__(i.label))}</button>`
						)
						.join("")}</div>
				</div>`
			)
			.join("");
		return this.h.card(__("Quick Links"), __("Everything in this module, one click away"), `<div class="iisc-links-wrap">${body}</div>`);
	},

	// ---------- mount ----------
	// Workspace page  (/desk/<module>)            → full module dashboard
	// Dashboard page  (/desk/…/dashboard-view/X)  → same dashboard, analytics only
	currentTarget() {
		const page = frappe.container && frappe.container.page;
		if (!page || !page.offsetParent) return null;
		const route = frappe.get_route() || [];
		const crumb = page.querySelector('.page-head .es-breadcrumbs__item[aria-current="page"] .es-breadcrumbs__label');
		const crumbText = crumb ? crumb.textContent.trim() : "";
		const sameAsCrumb = (name) => !crumbText || crumbText === name || crumbText === __(name);

		if (page.id === "page-Workspaces" && route[0] === "Workspaces" && route[1]) {
			const cfg = this.registry[route[1]];
			if (!cfg || !sameAsCrumb(route[1]) || this.isEditing()) return null;
			const container = page.querySelector(".layout-main-section");
			return container ? { cfg, mode: "workspace", key: `ws:${route[1]}`, container } : null;
		}
		if (page.id === "page-dashboard-view" && route[0] === "dashboard-view" && route[1]) {
			const cfg = Object.values(this.registry).find((c) => c.dashboard === route[1]);
			if (!cfg || !sameAsCrumb(route[1])) return null;
			const container = page.querySelector(".page-content");
			return container ? { cfg, mode: "dashboard", key: `db:${route[1]}`, container } : null;
		}
		return null;
	},

	isEditing() {
		return !!(frappe.workspace && frappe.workspace.is_read_only === false);
	},

	unmountAll() {
		document.querySelectorAll(".iisc-mod").forEach((e) => e.remove());
		document.querySelectorAll(".iisc-mod-on").forEach((e) => e.classList.remove("iisc-mod-on"));
	},

	render() {
		const t = this.currentTarget();
		if (!t) {
			if (document.querySelector(".iisc-mod")) this.unmountAll();
			return;
		}
		const { cfg, mode, key, container } = t;
		const existing = container.querySelector(":scope > .iisc-mod");
		if (existing && existing.dataset.key === key) {
			// Frappe can rewrite the container's classes when it refreshes the
			// page — keep its standard workspace / dashboard content hidden.
			container.classList.add("iisc-mod-on");
			return;
		}
		this.unmountAll();
		container.classList.add("iisc-mod-on");
		const actions = (cfg.actions || [])
			.filter((a) => frappe.model.can_create(a.doctype))
			.map(
				(a) => `<button class="iisc-btn ${a.primary ? "iisc-btn-primary" : "iisc-btn-outline"}" data-new="${esc(a.doctype)}">
					${svg(a.icon || "plus", 15)}${esc(a.label)}</button>`
			)
			.join("");
		const title = mode === "dashboard" ? cfg.dashboardTitle || __("{0} Analytics", [cfg.title || cfg.workspace]) : cfg.title || __(cfg.workspace);
		const back =
			mode === "dashboard"
				? `<button class="iisc-btn iisc-btn-outline" data-home-ws="${esc(cfg.workspace)}">${svg("grid", 15)}${__("Module Home")}</button>`
				: "";
		container.insertAdjacentHTML(
			"afterbegin",
			`<div class="iisc-mod" data-ws="${esc(cfg.workspace)}" data-key="${esc(key)}" data-mode="${mode}">
				<section class="iisc-card iisc-hero">
					<div>
						<h2 class="iisc-hero-title">${esc(title)}</h2>
						<p class="iisc-hero-sub">${esc(cfg.subtitle || "")} • <b>${esc(moment().format("ddd, MMM D, YYYY"))}</b></p>
					</div>
					<div class="iisc-hero-actions">
						${mode === "dashboard" ? back : actions}
						<select class="iisc-select" data-months title="${__("Period for monthly charts")}">
							<option value="6">${__("Last 6 Months")}</option>
							<option value="12">${__("Last 12 Months")}</option>
						</select>
					</div>
				</section>
				<div class="iisc-demo" hidden>
					<span class="iisc-demo-tag">${__("Sample data")}</span>
					<span>${__("No records in this module yet, so example figures are shown. Live data replaces them automatically.")}</span>
				</div>
				<div class="iisc-mod-body"><div class="iisc-muted iisc-pad">${__("Loading…")}</div></div>
			</div>`
		);
		const root = container.querySelector(":scope > .iisc-mod");
		root.querySelector("[data-months]").value = String(this.months);
		this.bind(root, cfg);
		this.load(root, cfg);
	},

	load(root, cfg) {
		Promise.resolve(frappe.call({ method: cfg.method, args: { months: this.months } }))
			.then((r) => {
				const d = r && r.message;
				if (!d || !document.body.contains(root)) return;
				root.iiscData = d;
				root.querySelector(".iisc-demo").hidden = !d.demo;
				root.querySelector(".iisc-mod-body").innerHTML = cfg.layout(d, this.h, this);
				if (cfg.charts) cfg.charts(root, d, this);
			})
			.catch((e) => {
				console.error("[iisc_theme] module dashboard failed", e);
				const b = root.querySelector(".iisc-mod-body");
				if (b) b.innerHTML = `<div class="iisc-empty iisc-pad">${__("Could not load this dashboard.")}</div>`;
			});
	},

	demoNotice() {
		frappe.show_alert({ message: __("This is sample data — there is no real record behind it yet."), indicator: "blue" });
	},

	act(root, btn) {
		const { act, dt, dn } = btn.dataset;
		if ((root.iiscData && root.iiscData.demo) || !dn) return this.demoNotice();
		const verb = act === "Approve" ? __("approve") : __("reject");
		frappe.confirm(__("Do you want to {0} {1} {2}?", [verb, __(dt), dn]), () => {
			Promise.resolve(
				frappe.call({ method: "iisc_theme.api.act_on_request", args: { doctype: dt, name: dn, action: act }, freeze: true })
			)
				.then(() => {
					frappe.show_alert({ message: __("{0} {1}", [__(dt), act === "Approve" ? __("approved") : __("rejected")]), indicator: "green" });
					const cfg = this.registry[root.dataset.ws];
					cfg && this.load(root, cfg);
				})
				.catch(() => frappe.set_route("Form", dt, dn));
		});
	},

	bind(root, cfg) {
		root.addEventListener("click", (ev) => {
			const q = (sel) => ev.target.closest(sel);
			if (q("[data-act]")) return this.act(root, q("[data-act]"));
			if (q("[data-new]")) return frappe.new_doc(q("[data-new]").dataset.new);
			if (q("[data-home-ws]")) return frappe.set_route("Workspaces", q("[data-home-ws]").dataset.homeWs);
			if (q("[data-route]")) return frappe.set_route(...JSON.parse(q("[data-route]").dataset.route));
			if (q("[data-open]")) {
				const o = q("[data-open]");
				if (!o.dataset.name) return this.demoNotice();
				return frappe.set_route("Form", o.dataset.open, o.dataset.name);
			}
			if (q("[data-list]")) {
				const l = q("[data-list]");
				let filters = {};
				try {
					filters = JSON.parse(l.dataset.filters || "{}");
				} catch (e) {}
				return frappe.set_route("List", l.dataset.list, filters);
			}
			if (q("[data-link-to]")) {
				const l = q("[data-link-to]");
				const t = l.dataset.linkType, to = l.dataset.linkTo;
				if (t === "DocType") return frappe.set_route("List", to); // singles redirect to their form
				if (t === "Report") return frappe.set_route("query-report", to);
				if (t === "Page") return frappe.set_route(to);
				if (t === "Dashboard") return frappe.set_route("dashboard-view", to);
			}
			if (cfg.onClick) cfg.onClick(ev, root, this);
		});
		root.querySelector("[data-months]").addEventListener("change", (ev) => {
			this.months = Number(ev.target.value) || 6;
			this.load(root, cfg);
		});
	},

	// Native <select> popups are drawn by the OS (blue highlight) and can't be
	// themed. Every select.iisc-select (home + module pages) gets an IISc menu
	// instead; the real <select> stays hidden underneath and still fires change.
	enhanceSelects() {
		document.querySelectorAll("select.iisc-select:not([data-iisc-dd])").forEach((sel) => {
			sel.dataset.iiscDd = "1";
			const wrap = document.createElement("div");
			wrap.className = "iisc-dd";
			sel.parentNode.insertBefore(wrap, sel);
			wrap.appendChild(sel);
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "iisc-dd-btn";
			btn.setAttribute("aria-haspopup", "listbox");
			btn.setAttribute("aria-expanded", "false");
			const menu = document.createElement("div");
			menu.className = "iisc-dd-menu";
			menu.setAttribute("role", "listbox");
			wrap.append(btn, menu);

			const paint = () => {
				const opt = sel.options[sel.selectedIndex];
				btn.innerHTML = `<span>${esc(opt ? opt.text : "")}</span>${svg("chevron", 14)}`;
				menu.innerHTML = [...sel.options]
					.map(
						(o, i) =>
							`<button type="button" role="option" class="iisc-dd-item" data-i="${i}" aria-selected="${o.selected}">${esc(o.text)}</button>`
					)
					.join("");
			};
			const close = () => {
				wrap.classList.remove("open");
				btn.setAttribute("aria-expanded", "false");
			};
			paint();
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				const open = !wrap.classList.contains("open");
				document.querySelectorAll(".iisc-dd.open").forEach((d) => d.classList.remove("open"));
				wrap.classList.toggle("open", open);
				btn.setAttribute("aria-expanded", String(open));
			});
			menu.addEventListener("click", (e) => {
				const item = e.target.closest(".iisc-dd-item");
				if (!item) return;
				e.stopPropagation();
				sel.selectedIndex = Number(item.dataset.i);
				sel.dispatchEvent(new Event("change", { bubbles: true }));
				paint();
				close();
			});
			sel.addEventListener("change", paint);
			document.addEventListener("click", close);
			document.addEventListener("keydown", (e) => e.key === "Escape" && close());
		});
	},

	safeRender() {
		try {
			this.render();
		} catch (e) {
			console.error("[iisc_theme] module dashboard render failed", e);
		}
		try {
			this.enhanceSelects();
		} catch (e) {
			console.error("[iisc_theme] select enhance failed", e);
		}
	},

	init() {
		let timer = null;
		const schedule = () => {
			if (timer) return;
			timer = setTimeout(() => {
				timer = null;
				this.safeRender();
			}, 40);
		};
		new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
		window.addEventListener("popstate", schedule);
		["pushState", "replaceState"].forEach((fn) => {
			const original = history[fn];
			history[fn] = function (...args) {
				const result = original.apply(this, args);
				schedule();
				return result;
			};
		});
		setInterval(() => this.safeRender(), 1000);
		this.safeRender();
	},
};

window.iiscModules = iiscModules;

$(document).ready(() => setTimeout(() => iiscModules.init(), 250));
