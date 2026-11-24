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
// Replaces the app-icon grid with an iEmpPower-style home: a module sidebar
// (built from frappe.boot.app_data — the same modules as the v16 dock),
// greeting + quick actions, live HR cards, approval overview and a chart.
// Frappe's icon grid (.desktop-container) is hidden by CSS while the home
// is present; it comes back in Frappe's icon Edit mode.

const IISC_ICONS = {
	users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
	calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
	check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
	wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
	sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
	plus: '<path d="M12 5v14M5 12h14"/>',
	grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
	chevron: '<path d="M9 18l6-6-6-6"/>',
	logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
};

const iiscSvg = (name, size = 18) =>
	`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IISC_ICONS[name]}</svg>`;

const iiscEsc = (v) => frappe.utils.escape_html(v === null || v === undefined ? "" : String(v));

const iiscHome = {
	loading: false,
	months: 6,
	chart: null,

	isAppsScreen() {
		const route = (window.frappe && frappe.get_route && frappe.get_route()) || [];
		return route.length <= 1 && !route[0] && document.querySelector("#page-desktop .desktop-container");
	},

	greeting() {
		const h = new Date().getHours();
		return h < 12 ? __("Good Morning") : h < 17 ? __("Good Afternoon") : __("Good Evening");
	},

	num(v) {
		return v === null || v === undefined ? "—" : iiscEsc(v);
	},

	// --- sidebar: apps + their modules, from frappe.boot.app_data ---
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
		const groups = this.apps()
			.map((a, idx) => {
				const items = a.modules
					.map(
						(m) => `
						<button class="iisc-side-item" data-module="${iiscEsc(m.link_to)}" data-type="${iiscEsc(m.link_type)}" data-url="${iiscEsc(m.url || "")}">
							<span class="iisc-side-icon">${frappe.utils.icon(m.icon || "folder-normal", "md")}</span>
							<span class="iisc-side-label">${iiscEsc(__(m.title))}</span>
						</button>`
					)
					.join("");
				const open = idx === 0; // Frappe HR expanded, others collapsed
				return `
					<div class="iisc-side-group ${open ? "open" : ""}">
						<button class="iisc-side-group-head" data-toggle-group>
							<span>${iiscEsc(__(a.title))}</span>
							<span class="iisc-side-chevron">${iiscSvg("chevron", 14)}</span>
						</button>
						<div class="iisc-side-items">${items}</div>
					</div>`;
			})
			.join("");

		const fullName = frappe.session.user_fullname || frappe.session.user;
		const initials = fullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
		const role = frappe.user_roles.includes("HR Manager")
			? __("HR Manager")
			: frappe.user_roles.includes("System Manager")
			? __("System Manager")
			: frappe.user_roles.includes("HR User")
			? __("HR User")
			: __("Employee");

		return `
			<aside class="iisc-side">
				<div class="iisc-side-brand">
					<img src="/assets/iisc_theme/images/iisc-logo.svg" alt="IISc" onerror="this.style.display='none'">
					<div class="iisc-side-brand-text">${__("HR Portal")}</div>
				</div>
				<div class="iisc-side-section">${__("My Work")}</div>
				<button class="iisc-side-item active" data-home>
					<span class="iisc-side-icon">${iiscSvg("grid")}</span>
					<span class="iisc-side-label">${__("Dashboard")}</span>
				</button>
				<div class="iisc-side-scroll">${groups}</div>
				<div class="iisc-side-user">
					<span class="iisc-side-avatar">${iiscEsc(initials)}</span>
					<span class="iisc-side-user-text">
						<span class="iisc-side-user-name">${iiscEsc(fullName)}</span>
						<span class="iisc-side-user-role">${role}</span>
					</span>
					<button class="iisc-side-logout" data-logout title="${__("Logout")}">${iiscSvg("logout")}</button>
				</div>
			</aside>`;
	},

	// --- main area ---
	actions() {
		return [
			{ doctype: "Employee", label: __("Add Employee"), primary: true },
			{ doctype: "Leave Application", label: __("Leave Application") },
			{ doctype: "Attendance", label: __("Mark Attendance") },
			{ doctype: "Payroll Entry", label: __("Payroll Entry") },
		]
			.filter((a) => frappe.model.can_create(a.doctype))
			.map(
				(a) => `
				<button class="iisc-btn ${a.primary ? "iisc-btn-primary" : "iisc-btn-outline"}" data-new="${a.doctype}">
					${a.primary ? iiscSvg("plus", 16) : ""}${a.label}
				</button>`
			)
			.join("");
	},

	card({ key, icon, tone, label, value, caption, subs }) {
		const subHtml = subs
			.map(
				(s) => `
				<div class="iisc-dash-sub">
					<div class="iisc-dash-sub-value ${s.tone}">${this.num(s.value)}</div>
					<div class="iisc-dash-sub-label">${s.label}</div>
				</div>`
			)
			.join("");
		return `
			<div class="iisc-dash-card" data-card="${key}" role="button" tabindex="0">
				<div class="iisc-dash-card-top">
					<span class="iisc-dash-icon ${tone}">${iiscSvg(icon)}</span>
					<span class="iisc-dash-label">${label}</span>
				</div>
				<div class="iisc-dash-value">${this.num(value)}</div>
				<div class="iisc-dash-caption">${caption}</div>
				<div class="iisc-dash-subs">${subHtml}</div>
			</div>`;
	},

	main() {
		const name = iiscEsc((frappe.boot.user && frappe.boot.user.first_name) || frappe.session.user_fullname || "");
		return `
			<section class="iisc-main">
				<div class="iisc-dash-head">
					<div>
						<h2 class="iisc-dash-title">${this.greeting()}, ${name}!</h2>
						<p class="iisc-dash-subtitle">${__("Here's what's happening across HR today.")}</p>
					</div>
					<div class="iisc-dash-actions">${this.actions()}</div>
				</div>
				<div class="iisc-dash-cards"><div class="iisc-dash-loading">${__("Loading…")}</div></div>
				<div class="iisc-panels">
					<div class="iisc-panel">
						<h3 class="iisc-panel-title">${__("Overview")}</h3>
						<p class="iisc-panel-sub">${__("Approval rate by module")}</p>
						<div class="iisc-overview"></div>
					</div>
					<div class="iisc-panel">
						<div class="iisc-panel-head">
							<div>
								<h3 class="iisc-panel-title">${__("Requests Over Time")}</h3>
								<p class="iisc-panel-sub">${__("Monthly requests across HR modules.")}</p>
							</div>
							<select class="iisc-select" data-months>
								<option value="6">${__("Last 6 Months")}</option>
								<option value="12">${__("Last 12 Months")}</option>
							</select>
						</div>
						<div class="iisc-chart"></div>
					</div>
				</div>
			</section>`;
	},

	fillCards(root, d) {
		const e = d.employees, l = d.leaves, a = d.attendance, s = d.salary_slips, h = d.holidays;
		root.querySelector(".iisc-dash-cards").innerHTML = [
			this.card({
				key: "employees", icon: "users", tone: "tone-teal", label: __("Employees"),
				value: e.total, caption: __("Active"),
				subs: [
					{ value: e.joined, label: __("Joined"), tone: "tone-teal" },
					{ value: e.relieving, label: __("Relieving"), tone: "tone-blue" },
					{ value: e.left, label: __("Left"), tone: "tone-red" },
				],
			}),
			this.card({
				key: "leaves", icon: "calendar", tone: "tone-blue", label: __("Leave Apps"),
				value: l.total, caption: __("This Year"),
				subs: [
					{ value: l.open, label: __("Pending"), tone: "tone-teal" },
					{ value: l.approved, label: __("Approved"), tone: "tone-blue" },
					{ value: l.rejected, label: __("Rejected"), tone: "tone-red" },
				],
			}),
			this.card({
				key: "attendance", icon: "check", tone: "tone-green", label: __("Attendance"),
				value: a.present, caption: __("Present Today"),
				subs: [
					{ value: a.present, label: __("Present"), tone: "tone-teal" },
					{ value: a.on_leave, label: __("On Leave"), tone: "tone-blue" },
					{ value: a.absent, label: __("Absent"), tone: "tone-red" },
				],
			}),
			this.card({
				key: "salary", icon: "wallet", tone: "tone-navy", label: __("Salary Slips"),
				value: s.total, caption: __("This Month"),
				subs: [
					{ value: s.draft, label: __("Draft"), tone: "tone-teal" },
					{ value: s.submitted, label: __("Submitted"), tone: "tone-blue" },
					{ value: s.cancelled, label: __("Cancelled"), tone: "tone-red" },
				],
			}),
			this.card({
				key: "holidays", icon: "sun", tone: "tone-orange", label: __("Holidays"),
				value: h.upcoming, caption: __("Upcoming This Year"),
				subs: [{ value: h.this_month, label: __("This Month"), tone: "tone-navy" }],
			}),
		].join("");
	},

	fillOverview(root, rows) {
		const el = root.querySelector(".iisc-overview");
		if (!rows || !rows.length) {
			el.innerHTML = `<div class="iisc-dash-loading">${__("No data yet.")}</div>`;
			return;
		}
		el.innerHTML = rows
			.map((r) => {
				const pct = r.total ? Math.round((r.approved / r.total) * 100) : 0;
				return `
				<div class="iisc-ov-row" data-list="${iiscEsc(r.doctype)}" role="button" tabindex="0">
					<div class="iisc-ov-top">
						<span class="iisc-ov-label">${iiscEsc(__(r.label))}</span>
						<span class="iisc-ov-total">${iiscEsc(r.total)} ${__("Total")}</span>
					</div>
					<div class="iisc-ov-bar"><span style="width:${pct}%"></span></div>
					<div class="iisc-ov-foot">
						<span>${iiscEsc(r.approved)} ${__("Approved")}</span>
						<span>${pct}% ${__("Approval Rate")}</span>
					</div>
				</div>`;
			})
			.join("");
	},

	fillChart(root, series) {
		const el = root.querySelector(".iisc-chart");
		if (!series || !series.datasets || !series.datasets.length) {
			el.innerHTML = `<div class="iisc-dash-loading">${__("No data yet.")}</div>`;
			return;
		}
		el.innerHTML = "";
		this.chart = new frappe.Chart(el, {
			data: { labels: series.labels, datasets: series.datasets },
			type: "bar",
			height: 260,
			colors: ["#108896", "#1b374c", "#ee5030"],
			barOptions: { spaceRatio: 0.45 },
			axisOptions: { xIsSeries: true },
		});
	},

	open(key) {
		const d = this.data || {};
		const routes = {
			employees: () => frappe.set_route("List", "Employee", { status: "Active" }),
			leaves: () => frappe.set_route("List", "Leave Application"),
			attendance: () => frappe.set_route("List", "Attendance", { attendance_date: d.today }),
			salary: () => frappe.set_route("List", "Salary Slip"),
			holidays: () =>
				d.holidays && d.holidays.holiday_list
					? frappe.set_route("Form", "Holiday List", d.holidays.holiday_list)
					: frappe.set_route("List", "Holiday List"),
		};
		routes[key] && routes[key]();
	},

	bind(root) {
		root.addEventListener("click", (ev) => {
			const t = ev.target;
			const newBtn = t.closest("[data-new]");
			if (newBtn) return frappe.new_doc(newBtn.dataset.new);
			const card = t.closest("[data-card]");
			if (card) return this.open(card.dataset.card);
			const ov = t.closest("[data-list]");
			if (ov) return frappe.set_route("List", ov.dataset.list);
			const mod = t.closest("[data-module]");
			if (mod) return this.openModule(mod.dataset.type, mod.dataset.module, mod.dataset.url);
			const grp = t.closest("[data-toggle-group]");
			if (grp) return grp.parentElement.classList.toggle("open");
			if (t.closest("[data-logout]")) return frappe.app.logout();
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
		if (this.loading) return;
		this.loading = true;
		frappe
			.call({ method: "iisc_theme.api.get_hr_dashboard", args: { months: this.months }, freeze: false })
			.then((r) => {
				const d = r.message;
				if (!d) return;
				this.data = d;
				this.fillCards(root, d);
				this.fillOverview(root, d.overview);
				this.fillChart(root, d.series);
			})
			.catch(() => {
				const cards = root.querySelector(".iisc-dash-cards");
				if (cards) cards.innerHTML = `<div class="iisc-dash-loading">${__("Could not load HR numbers.")}</div>`;
			})
			.finally(() => (this.loading = false));
	},

	render() {
		if (!this.isAppsScreen()) return false;
		// Inserted as a sibling of .desktop-container (Frappe's icon grid),
		// which CSS hides while .iisc-home is present.
		const container = document.querySelector("#page-desktop .desktop-container");
		const wrapper = container.parentElement;
		let root = wrapper.querySelector(":scope > .iisc-home");
		if (!root) {
			container.insertAdjacentHTML("beforebegin", `<div class="iisc-home">${this.sidebar()}${this.main()}</div>`);
			root = wrapper.querySelector(":scope > .iisc-home");
			this.bind(root);
		}
		this.load(root);
		return true;
	},

	// Frappe draws the Apps screen asynchronously — retry for a few seconds.
	ensure(tries = 24) {
		if (this.render() || tries <= 0) return;
		setTimeout(() => this.ensure(tries - 1), 250);
	},

	init() {
		this.ensure();
		if (window.frappe && frappe.router) {
			frappe.router.on("change", () => setTimeout(() => this.ensure(), 150));
		}
	},
};

$(document).ready(() =>
	setTimeout(() => {
		iiscFooter.init();
		iiscHome.init();
	}, 200)
);
