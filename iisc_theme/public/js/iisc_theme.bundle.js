// =====================================================================
// IISc Theme — Frappe v16 (16.60) Desk
//  1. IISc fonts (Source Sans + Playfair Display, as on iisc.ac.in)
//  2. Footer pinned to the bottom of the screen (desktop)
//  3. HR dashboard on the Apps screen (/desk), above the app icons
// =====================================================================

// ---------- 1. Fonts ----------
(function iiscLoadFonts() {
	if (document.getElementById("iisc-fonts")) return;
	const link = document.createElement("link");
	link.id = "iisc-fonts";
	link.rel = "stylesheet";
	link.href =
		"https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Source+Sans+3:wght@300..800&display=swap";
	document.head.appendChild(link);
})();

// ---------- 2. Footer ----------
// Appended to <body>, position: fixed (bundle.css §5). left/width follow
// .main-section; --iisc-footer-h shortens .main-section by the footer height.
const iiscFooter = {
	el: null,

	render() {
		if (this.el && document.body.contains(this.el)) return;
		this.el = document.createElement("div");
		this.el.className = "iisc-footer";
		this.el.innerHTML = `
			<span>© ${new Date().getFullYear()} Indian Institute of Science, Bengaluru | Design: ITChamps</span>
			<img src="/assets/iisc_theme/images/iisc-logo.svg" alt="IISc" onerror="this.style.display='none'">
		`;
		document.body.appendChild(this.el);
		document.body.classList.add("iisc-footer-on");
	},

	place() {
		const main = document.querySelector(".main-section");
		if (!this.el || !main) return;

		const rect = main.getBoundingClientRect();
		this.el.style.left = `${rect.left}px`;
		this.el.style.width = `${main.clientWidth}px`; // excludes the scrollbar

		const h = `${this.el.offsetHeight}px`;
		if (document.body.style.getPropertyValue("--iisc-footer-h") !== h) {
			document.body.style.setProperty("--iisc-footer-h", h);
			// Frappe's list view sizes its scroll area on window resize
			// (ListView.setup_resize_handler → set_result_height) — re-run it
			// now that .main-section is shorter.
			window.dispatchEvent(new Event("resize"));
		}
	},

	init() {
		this.render();
		this.place();

		const main = document.querySelector(".main-section");
		if (main && window.ResizeObserver) {
			new ResizeObserver(() => this.place()).observe(main);
		}
		window.addEventListener("resize", () => this.place());

		if (window.frappe && frappe.router) {
			frappe.router.on("change", () =>
				setTimeout(() => {
					this.render();
					this.place();
				}, 200)
			);
		}
	},
};

// ---------- 3. IISc HR home on the Apps screen (/desk) ----------
// Replaces Frappe's app-icon grid with an HR portal home (layout from the
// approved Gemini design, IISc palette): full-height module sidebar built
// from frappe.boot.app_data (same modules as the v16 dock), top bar,
// greeting, KPI cards, requests chart, approval overview, pending approval
// queue, upcoming holidays and the latest HR notice.
// Frappe rebuilds .desktop-wrapper whenever /desk is shown, so a
// MutationObserver re-inserts the home every time (route events are not
// reliable for this page).

const IISC_ICONS = {
	users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
	calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
	check: '<path d="M16 11l2 2 4-4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
	file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
	sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
	plus: '<path d="M12 5v14M5 12h14"/>',
	grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
	chevron: '<path d="M6 9l6 6 6-6"/>',
	logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
	search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
	bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
	help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
	leave: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>',
	attendance: '<path d="M20 6L9 17l-5-5"/>',
	payroll: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
	arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
};

const iiscSvg = (name, size = 18) =>
	`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IISC_ICONS[name]}</svg>`;

const iiscEsc = (v) => frappe.utils.escape_html(v === null || v === undefined ? "" : String(v));

const IISC_BADGE_MODULES = {
	Leaves: ["Leave Application"],
	Expenses: ["Expense Claim"],
	"Shift & Attendance": ["Attendance Request", "Shift Request"],
};

const iiscHome = {
	months: 6,
	data: null,

	isAppsScreen() {
		// Use the URL, not frappe.get_route(): the route can lag behind the DOM.
		return /^\/(desk|app)\/?$/.test(location.pathname) && document.querySelector("#page-desktop .desktop-wrapper");
	},

	greeting() {
		const h = new Date().getHours();
		return h < 12 ? __("Good Morning") : h < 17 ? __("Good Afternoon") : __("Good Evening");
	},

	num(v) {
		return v === null || v === undefined ? "—" : iiscEsc(v);
	},

	role() {
		const r = frappe.user_roles || [];
		if (r.includes("HR Manager")) return __("HR Manager");
		if (r.includes("HR User")) return __("HR User");
		if (r.includes("System Manager")) return __("System Manager");
		return __("Employee");
	},

	initials(name) {
		return (name || "?")
			.split(/\s+/)
			.filter(Boolean)
			.map((p) => p[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();
	},

	// ---------------- sidebar ----------------
	apps() {
		const order = { hrms: 0, erpnext: 1, frappe: 2 };
		const sidebars = frappe.boot.module_sidebars || {};
		return (frappe.boot.app_data || [])
			.filter((a) => a.on_apps_screen && (a.dock || []).length)
			.sort((a, b) => (order[a.app_name] ?? 9) - (order[b.app_name] ?? 9))
			.map((a) => ({
				name: a.app_name,
				title: a.app_title,
				modules: a.dock.filter((d) => d.link_type !== "Sidebar" || sidebars[d.link_to]),
			}))
			.filter((a) => a.modules.length);
	},

	openModule(link_type, link_to, url) {
		if (link_type === "URL" && url) return (window.location.href = url);
		const sb = (frappe.boot.module_sidebars || {})[link_to];
		const first = sb && (sb.items || []).find((i) => i.type === "Link");
		if (first && first.link_type === "Workspace") return frappe.set_route("Workspaces", first.link_to);
		if (first && first.link_type === "DocType") return frappe.set_route("List", first.link_to);
		if (first && first.link_type === "Report") return frappe.set_route("query-report", first.link_to);
		if (first && first.link_type === "Page") return frappe.set_route(first.link_to);
		frappe.set_route(frappe.router.slug(link_to));
	},

	sidebar() {
		const hrVersion = ((frappe.boot.versions && frappe.boot.versions.hrms) || "").split(".")[0];
		const groups = this.apps()
			.map((a, idx) => {
				const items = a.modules
					.map(
						(m) => `
						<button class="iisc-side-item" data-module="${iiscEsc(m.link_to)}" data-type="${iiscEsc(m.link_type)}" data-url="${iiscEsc(m.url || "")}">
							<span class="iisc-side-icon">${frappe.utils.icon(m.icon || "folder-normal", "md")}</span>
							<span class="iisc-side-label">${iiscEsc(__(m.title))}</span>
							<span class="iisc-side-badge" data-badge="${iiscEsc(m.link_to)}"></span>
						</button>`
					)
					.join("");
				const isHr = a.name === "hrms";
				return `
					<div class="iisc-side-group ${idx === 0 ? "open" : ""} ${isHr ? "is-primary" : ""}">
						<button class="iisc-side-group-head" data-toggle-group>
							<span>${iiscEsc(isHr ? __(a.title) : __("{0} Modules", [__(a.title)]))}</span>
							${isHr ? "" : `<span class="iisc-side-chevron">${iiscSvg("chevron", 14)}</span>`}
						</button>
						<div class="iisc-side-items">${items}</div>
					</div>`;
			})
			.join("");

		const fullName = frappe.session.user_fullname || frappe.session.user;
		return `
			<aside class="iisc-side">
				<div class="iisc-side-brand">
					<span class="iisc-side-logo">IISc</span>
					<span class="iisc-side-brand-text">
						<span class="iisc-side-brand-title">${__("Frappe HR")} ${hrVersion ? `<span class="iisc-side-ver">v${iiscEsc(hrVersion)}</span>` : ""}</span>
						<span class="iisc-side-brand-sub">${__("HR & Payroll Portal")}</span>
					</span>
				</div>
				<div class="iisc-side-scroll">
					<div class="iisc-side-section">${__("My Work")}</div>
					<button class="iisc-side-item active" data-home>
						<span class="iisc-side-icon">${iiscSvg("grid", 16)}</span>
						<span class="iisc-side-label">${__("Dashboard")}</span>
					</button>
					${groups}
				</div>
				<div class="iisc-side-user">
					<button class="iisc-side-user-main" data-my-settings title="${__("My Settings")}">
						<span class="iisc-side-avatar">${iiscEsc(this.initials(fullName))}<i></i></span>
						<span class="iisc-side-user-text">
							<span class="iisc-side-user-name">${iiscEsc(fullName)}</span>
							<span class="iisc-side-user-role">${this.role()} • IISc</span>
						</span>
					</button>
					<button class="iisc-side-logout" data-logout title="${__("Logout")}">${iiscSvg("logout", 16)}</button>
				</div>
			</aside>`;
	},

	// ---------------- top bar ----------------
	topbar() {
		return `
			<header class="iisc-topbar">
				<button class="iisc-search" data-search>
					${iiscSvg("search", 16)}
					<span>${__("Search employees, leaves, payroll…")}</span>
					<kbd>Ctrl K</kbd>
				</button>
				<div class="iisc-topbar-right">
					<button class="iisc-icon-btn" data-notifications title="${__("Notifications")}">
						${iiscSvg("bell", 18)}<span class="iisc-dot" hidden></span>
					</button>
					<a class="iisc-icon-btn" href="https://docs.frappe.io/hr" target="_blank" rel="noopener" title="${__("Help")}">${iiscSvg("help", 18)}</a>
				</div>
			</header>`;
	},

	// ---------------- main ----------------
	actions() {
		return [
			{ doctype: "Employee", label: __("Add Employee"), icon: "plus", primary: true },
			{ doctype: "Leave Application", label: __("Leave Application"), icon: "leave" },
			{ doctype: "Attendance", label: __("Mark Attendance"), icon: "attendance" },
			{ doctype: "Payroll Entry", label: __("Payroll Entry"), icon: "payroll" },
		]
			.filter((a) => frappe.model.can_create(a.doctype))
			.map(
				(a) => `
				<button class="iisc-btn ${a.primary ? "iisc-btn-primary" : "iisc-btn-outline"}" data-new="${a.doctype}">
					${iiscSvg(a.icon, 15)}${a.label}
				</button>`
			)
			.join("");
	},

	main() {
		const name = iiscEsc((frappe.boot.user && frappe.boot.user.first_name) || frappe.session.user_fullname || "");
		const dateStr = moment().format("ddd, MMM D, YYYY");
		return `
			<main class="iisc-main">
				<section class="iisc-card iisc-hero">
					<div>
						<h2 class="iisc-hero-title">${this.greeting()}, ${name}! <span class="iisc-pill">${this.role()}</span></h2>
						<p class="iisc-hero-sub">${__("Here is what's happening across Indian Institute of Science HR today")} • <b>${iiscEsc(dateStr)}</b></p>
					</div>
					<div class="iisc-hero-actions">${this.actions()}</div>
				</section>

				<section class="iisc-kpis"><div class="iisc-muted">${__("Loading…")}</div></section>

				<section class="iisc-row iisc-row-chart">
					<div class="iisc-card iisc-pad">
						<div class="iisc-card-head">
							<div>
								<h3 class="iisc-card-title">${__("Requests Over Time")}</h3>
								<p class="iisc-card-sub">${__("Monthly HR volume across leaves, expenses & attendance")}</p>
							</div>
							<select class="iisc-select" data-months>
								<option value="6">${__("Last 6 Months")}</option>
								<option value="12">${__("Last 12 Months")}</option>
							</select>
						</div>
						<div class="iisc-chart"></div>
					</div>
					<div class="iisc-card iisc-pad">
						<div class="iisc-card-head">
							<div>
								<h3 class="iisc-card-title">${__("Overview")}</h3>
								<p class="iisc-card-sub">${__("Track pending vs processed employee workflows")}</p>
							</div>
							<span class="iisc-card-meta">${__("Approval rate by module")}</span>
						</div>
						<div class="iisc-overview"></div>
					</div>
				</section>

				<section class="iisc-row iisc-row-bottom">
					<div class="iisc-card">
						<div class="iisc-card-head iisc-pad-x">
							<div>
								<h3 class="iisc-card-title">${__("Pending Approval Queue")}</h3>
								<p class="iisc-card-sub">${__("Items requiring HR sign-off")}</p>
							</div>
							<span class="iisc-pill iisc-pill-teal" data-pending-count>—</span>
						</div>
						<div class="iisc-queue"></div>
					</div>
					<div class="iisc-side-col">
						<div class="iisc-card iisc-pad">
							<div class="iisc-card-head">
								<h3 class="iisc-card-title iisc-with-icon">${iiscSvg("calendar", 16)} ${__("Upcoming IISc Holidays")}</h3>
								<button class="iisc-link" data-holidays>${__("View Calendar")}</button>
							</div>
							<div class="iisc-holidays"></div>
						</div>
						<div class="iisc-notice"></div>
					</div>
				</section>
			</main>`;
	},

	// ---------------- KPI cards ----------------
	kpi({ key, label, icon, tone, value, chip, chipTone, subs, footer }) {
		const subsHtml = subs
			? `<div class="iisc-kpi-subs">${subs
					.map(
						(s) => `<div><b class="${s.tone || ""}">${this.num(s.value)}</b><span>${s.label}</span></div>`
					)
					.join("")}</div>`
			: "";
		return `
			<div class="iisc-card iisc-kpi" data-card="${key}" role="button" tabindex="0">
				<div class="iisc-kpi-top">
					<span class="iisc-kpi-label">${label}</span>
					<span class="iisc-kpi-icon ${tone}">${iiscSvg(icon, 16)}</span>
				</div>
				<div class="iisc-kpi-value">${this.num(value)}${chip ? `<span class="iisc-chip ${chipTone}">${chip}</span>` : ""}</div>
				${subsHtml}${footer || ""}
			</div>`;
	},

	fillKpis(root, d) {
		const e = d.employees, l = d.leaves, a = d.attendance, s = d.salary_slips, h = d.holidays;
		const next = (h.next || [])[0];
		root.querySelector(".iisc-kpis").innerHTML = [
			this.kpi({
				key: "employees", label: __("Employees"), icon: "users", tone: "t-teal", value: e.total,
				chip: e.joined ? `+${iiscEsc(e.joined)} ${__("this month")}` : null, chipTone: "c-teal",
				subs: [
					{ value: e.joined, label: __("Joined") },
					{ value: e.relieving, label: __("Relieving") },
					{ value: e.left, label: __("Left") },
				],
			}),
			this.kpi({
				key: "leaves", label: __("Leave Apps"), icon: "calendar", tone: "t-orange", value: l.total,
				chip: __("This Year"), chipTone: "c-orange",
				subs: [
					{ value: l.open, label: __("Pending"), tone: "x-orange" },
					{ value: l.approved, label: __("Approved"), tone: "x-teal" },
					{ value: l.rejected, label: __("Rejected"), tone: "x-red" },
				],
			}),
			this.kpi({
				key: "attendance", label: __("Attendance"), icon: "check", tone: "t-teal", value: a.present,
				chip: a.present_pct !== null && a.present_pct !== undefined ? `${a.present_pct}% ${__("Today")}` : __("Today"),
				chipTone: "c-teal",
				subs: [
					{ value: a.present, label: __("Present"), tone: "x-teal" },
					{ value: a.on_leave, label: __("On Leave"), tone: "x-blue" },
					{ value: a.absent, label: __("Absent"), tone: "x-red" },
				],
			}),
			this.kpi({
				key: "salary", label: __("Salary Slips"), icon: "file", tone: "t-blue", value: s.total,
				chip: iiscEsc(s.month_label || ""), chipTone: "c-blue",
				subs: [
					{ value: s.draft, label: __("Draft") },
					{ value: s.submitted, label: __("Submitted"), tone: "x-teal" },
					{ value: s.cancelled, label: __("Cancelled") },
				],
			}),
			this.kpi({
				key: "holidays", label: __("Holidays"), icon: "sun", tone: "t-orange", value: h.upcoming,
				chip: h.this_month ? `${__("Upcoming")} ${iiscEsc(h.this_month)}` : null, chipTone: "c-orange",
				footer: next
					? `<div class="iisc-kpi-foot"><span>${iiscEsc(next.name)}</span><span class="iisc-chip c-navy">${iiscEsc(moment(next.date).format("MMM D"))}</span></div>`
					: `<div class="iisc-kpi-foot iisc-muted">${h.holiday_list === null ? __("No default holiday list") : __("No upcoming holidays")}</div>`,
			}),
		].join("");
	},

	// ---------------- chart ----------------
	fillChart(root, series) {
		const el = root.querySelector(".iisc-chart");
		if (!series || !series.datasets || !series.datasets.length) {
			el.innerHTML = `<div class="iisc-empty">${__("No data yet.")}</div>`;
			return;
		}
		el.innerHTML = "";
		new frappe.Chart(el, {
			data: { labels: series.labels, datasets: series.datasets },
			type: "line",
			height: 280,
			colors: ["#1b374c", "#ee5030", "#108896"],
			lineOptions: { regionFill: 1, dotSize: 5, spline: 1 },
			axisOptions: { xIsSeries: true, xAxisMode: "tick", yAxisMode: "span" },
		});
	},

	// ---------------- overview ----------------
	fillOverview(root, rows) {
		const el = root.querySelector(".iisc-overview");
		if (!rows || !rows.length) {
			el.innerHTML = `<div class="iisc-empty">${__("No data yet.")}</div>`;
			return;
		}
		const tones = ["b-navy", "b-teal", "b-orange", "b-blue"];
		el.innerHTML = rows
			.map((r, i) => {
				const pct = r.total ? Math.round((r.approved / r.total) * 100) : 0;
				return `
				<div class="iisc-ov-row" data-list="${iiscEsc(r.doctype)}" role="button" tabindex="0">
					<div class="iisc-ov-top"><b>${iiscEsc(__(r.label))}</b><span><b>${iiscEsc(r.total)}</b> ${__("Total")}</span></div>
					<div class="iisc-ov-bar"><span class="${tones[i % 4]}" style="width:${pct}%"></span></div>
					<div class="iisc-ov-foot"><span>${iiscEsc(r.approved)} ${__("Approved")}</span><b class="${tones[i % 4]}-text">${pct}% ${__("Approval Rate")}</b></div>
				</div>`;
			})
			.join("");
	},

	// ---------------- pending queue ----------------
	when(dt) {
		const m = moment(dt);
		if (m.isSame(moment(), "day")) return `${__("Today")}, ${m.format("h:mm A")}`;
		if (m.isSame(moment().subtract(1, "day"), "day")) return `${__("Yesterday")}, ${m.format("h:mm A")}`;
		return m.format("MMM D, YYYY");
	},

	typeTone(doctype) {
		return { "Leave Application": "c-orange", "Expense Claim": "c-red", "Attendance Request": "c-blue", "Shift Request": "c-navy" }[doctype] || "c-navy";
	},

	fillQueue(root, pending) {
		const el = root.querySelector(".iisc-queue");
		const countEl = root.querySelector("[data-pending-count]");
		const total = (pending && pending.total) || 0;
		countEl.textContent = __("{0} Requests Awaiting", [total]);
		if (!pending || !pending.items.length) {
			el.innerHTML = `<div class="iisc-empty iisc-pad">${__("You're all caught up — no requests are awaiting approval.")}</div>`;
			return;
		}
		const rows = pending.items
			.map(
				(it) => `
				<tr>
					<td>
						<div class="iisc-emp">
							<span class="iisc-emp-avatar">${iiscEsc(this.initials(it.employee_name))}</span>
							<span><b>${iiscEsc(it.employee_name)}</b><small>${iiscEsc(it.department || "")}</small></span>
						</div>
					</td>
					<td><span class="iisc-chip ${this.typeTone(it.doctype)}">${iiscEsc(it.type)}</span></td>
					<td class="iisc-q-details">${iiscEsc(it.details)}</td>
					<td class="iisc-muted">${iiscEsc(this.when(it.creation))}</td>
					<td class="iisc-q-actions">
						<button class="iisc-mini iisc-mini-approve" data-act="Approve" data-dt="${iiscEsc(it.doctype)}" data-dn="${iiscEsc(it.name)}">${__("Approve")}</button>
						<button class="iisc-mini" data-act="Reject" data-dt="${iiscEsc(it.doctype)}" data-dn="${iiscEsc(it.name)}">${__("Reject")}</button>
					</td>
				</tr>`
			)
			.join("");
		const top = Object.entries(pending.by_doctype || {}).sort((a, b) => b[1] - a[1])[0];
		el.innerHTML = `
			<div class="iisc-table-wrap">
				<table class="iisc-table">
					<thead><tr><th>${__("Employee")}</th><th>${__("Type")}</th><th>${__("Details")}</th><th>${__("Date Submitted")}</th><th class="text-right">${__("Actions")}</th></tr></thead>
					<tbody>${rows}</tbody>
				</table>
			</div>
			<button class="iisc-table-foot" data-list="${iiscEsc(top ? top[0] : "Leave Application")}">
				${__("View All {0} Pending Requests", [total])} ${iiscSvg("arrow", 14)}
			</button>`;
	},

	act(btn) {
		const { act, dt, dn } = btn.dataset;
		const verb = act === "Approve" ? __("approve") : __("reject");
		frappe.confirm(__("Do you want to {0} {1} {2}?", [verb, __(dt), dn]), () => {
			frappe
				.call({ method: "iisc_theme.api.act_on_request", args: { doctype: dt, name: dn, action: act }, freeze: true })
				.then(() => {
					frappe.show_alert({ message: __("{0} {1}", [__(dt), act === "Approve" ? __("approved") : __("rejected")]), indicator: "green" });
					const root = document.querySelector(".iisc-app");
					root && this.load(root);
				})
				.catch(() => {
					// server message already shown — offer to open the document
					frappe.set_route("Form", dt, dn);
				});
		});
	},

	// ---------------- holidays + notice ----------------
	fillHolidays(root, h) {
		const el = root.querySelector(".iisc-holidays");
		if (!h || !h.holiday_list) {
			el.innerHTML = `<div class="iisc-empty">${__("Set a Default Holiday List on the company to see holidays here.")}</div>`;
			return;
		}
		if (!h.next || !h.next.length) {
			el.innerHTML = `<div class="iisc-empty">${__("No upcoming holidays.")}</div>`;
			return;
		}
		el.innerHTML = h.next
			.map((x) => {
				const m = moment(x.date);
				const chip =
					x.days_left <= 7
						? `<span class="iisc-chip c-teal">${x.days_left === 0 ? __("Today") : __("{0} Days Left", [x.days_left])}</span>`
						: `<span class="iisc-chip c-gray">${__("Upcoming")}</span>`;
				return `
				<div class="iisc-hol">
					<span class="iisc-hol-date"><small>${iiscEsc(m.format("MMM").toUpperCase())}</small><b>${iiscEsc(m.format("DD"))}</b></span>
					<span class="iisc-hol-text"><b>${iiscEsc(x.name)}</b><small>${iiscEsc(m.format("dddd"))}</small></span>
					${chip}
				</div>`;
			})
			.join("");
	},

	fillNotice(root, n) {
		const el = root.querySelector(".iisc-notice");
		const canCreate = frappe.model.can_create("Note");
		el.innerHTML = `
			<div class="iisc-notice-card">
				<span class="iisc-notice-label">${__("IISc HR Notice")}</span>
				<h4>${n ? iiscEsc(n.title) : __("No notices yet")}</h4>
				<p>${n ? iiscEsc(n.text) : __("Post a public Note to share announcements with all staff.")}</p>
				${
					n
						? `<button class="iisc-notice-btn" data-note="${iiscEsc(n.name)}">${__("Read Notice")}</button>`
						: canCreate
						? `<button class="iisc-notice-btn" data-new-note>${__("Post a Notice")}</button>`
						: ""
				}
			</div>`;
	},

	fillBadges(root, d) {
		const by = (d.pending && d.pending.by_doctype) || {};
		root.querySelectorAll("[data-badge]").forEach((b) => {
			const dts = IISC_BADGE_MODULES[b.dataset.badge];
			const n = dts ? dts.reduce((s, dt) => s + (by[dt] || 0), 0) : 0;
			b.textContent = n ? (b.dataset.badge === "Expenses" ? __("{0} Pending", [n]) : n) : "";
			b.classList.toggle("is-alert", b.dataset.badge === "Expenses" && n > 0);
		});
		const dot = root.querySelector(".iisc-dot");
		if (dot) dot.hidden = !d.unread_notifications;
	},

	// ---------------- events ----------------
	open(key) {
		const d = this.data || {};
		const routes = {
			employees: () => frappe.set_route("List", "Employee", { status: "Active" }),
			leaves: () => frappe.set_route("List", "Leave Application"),
			attendance: () => frappe.set_route("List", "Attendance", { attendance_date: d.today }),
			salary: () => frappe.set_route("List", "Salary Slip"),
			holidays: () => this.openHolidays(),
		};
		routes[key] && routes[key]();
	},

	openHolidays() {
		const h = (this.data && this.data.holidays) || {};
		h.holiday_list ? frappe.set_route("Form", "Holiday List", h.holiday_list) : frappe.set_route("List", "Holiday List");
	},

	bind(root) {
		root.addEventListener("click", (ev) => {
			const t = ev.target;
			const q = (sel) => t.closest(sel);
			if (q("[data-act]")) return this.act(q("[data-act]"));
			if (q("[data-new]")) return frappe.new_doc(q("[data-new]").dataset.new);
			if (q("[data-card]")) return this.open(q("[data-card]").dataset.card);
			if (q("[data-list]")) return frappe.set_route("List", q("[data-list]").dataset.list);
			if (q("[data-module]")) {
				const m = q("[data-module]");
				return this.openModule(m.dataset.type, m.dataset.module, m.dataset.url);
			}
			if (q("[data-toggle-group]")) return q("[data-toggle-group]").parentElement.classList.toggle("open");
			if (q("[data-holidays]")) return this.openHolidays();
			if (q("[data-note]")) return frappe.set_route("Form", "Note", q("[data-note]").dataset.note);
			if (q("[data-new-note]")) return frappe.new_doc("Note", { public: 1 });
			if (q("[data-search]")) {
				const b = document.querySelector("#page-desktop .search-widget-button");
				return b && b.click();
			}
			if (q("[data-notifications]")) return frappe.set_route("List", "Notification Log");
			if (q("[data-my-settings]")) return frappe.set_route("Form", "User", frappe.session.user);
			if (q("[data-logout]")) return frappe.app.logout();
		});
		root.addEventListener("keydown", (ev) => {
			const card = ev.target.closest("[data-card]");
			if (card && (ev.key === "Enter" || ev.key === " ")) {
				ev.preventDefault();
				this.open(card.dataset.card);
			}
		});
		root.querySelector("[data-months]").addEventListener("change", (ev) => {
			this.months = Number(ev.target.value) || 6;
			this.load(root);
		});
	},

	load(root) {
		if (root.iiscLoading) return;
		root.iiscLoading = true;
		frappe
			.call({ method: "iisc_theme.api.get_hr_dashboard", args: { months: this.months }, freeze: false })
			.then((r) => {
				const d = r.message;
				if (!d || !document.body.contains(root)) return;
				this.data = d;
				this.fillKpis(root, d);
				this.fillChart(root, d.series);
				this.fillOverview(root, d.overview);
				this.fillQueue(root, d.pending);
				this.fillHolidays(root, d.holidays);
				this.fillNotice(root, d.notice);
				this.fillBadges(root, d);
			})
			.catch(() => {
				const k = root.querySelector(".iisc-kpis");
				if (k) k.innerHTML = `<div class="iisc-muted">${__("Could not load HR numbers.")}</div>`;
			})
			.finally(() => (root.iiscLoading = false));
	},

	render() {
		if (!this.isAppsScreen()) return;
		const wrapper = document.querySelector("#page-desktop .desktop-wrapper");
		if (wrapper.querySelector(":scope > .iisc-app")) return;
		wrapper.insertAdjacentHTML(
			"afterbegin",
			`<div class="iisc-app">${this.sidebar()}<div class="iisc-content">${this.topbar()}${this.main()}</div></div>`
		);
		const root = wrapper.querySelector(":scope > .iisc-app");
		this.bind(root);
		this.load(root);
	},

	init() {
		this.render();
		// Re-insert whenever Frappe (re)builds the Apps screen or the URL changes.
		// setTimeout (not requestAnimationFrame) so it never stalls in a background tab.
		let timer = null;
		const schedule = () => {
			if (timer) return;
			timer = setTimeout(() => {
				timer = null;
				this.render();
			}, 30);
		};
		new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
		window.addEventListener("popstate", schedule);
	},
};

$(document).ready(() =>
	setTimeout(() => {
		iiscFooter.init();
		iiscHome.init();
	}, 200)
);
