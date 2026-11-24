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

// ---------- 3. HR dashboard on the Apps screen ----------
const IISC_ICONS = {
	users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
	calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
	check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
	wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
	sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
	plus: '<path d="M12 5v14M5 12h14"/>',
};

const iiscSvg = (name) =>
	`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IISC_ICONS[name]}</svg>`;

const iiscDashboard = {
	loading: false,

	isAppsScreen() {
		const route = (window.frappe && frappe.get_route && frappe.get_route()) || [];
		return route.length <= 1 && !route[0] && document.querySelector("#page-desktop .desktop-container");
	},

	greeting() {
		const h = new Date().getHours();
		return h < 12 ? __("Good Morning") : h < 17 ? __("Good Afternoon") : __("Good Evening");
	},

	num(v) {
		return v === null || v === undefined ? "—" : frappe.utils.escape_html(String(v));
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

	actions() {
		const items = [
			{ doctype: "Employee", label: __("Add Employee"), primary: true },
			{ doctype: "Leave Application", label: __("Leave Application") },
			{ doctype: "Attendance", label: __("Mark Attendance") },
			{ doctype: "Payroll Entry", label: __("Payroll Entry") },
		].filter((a) => frappe.model.can_create(a.doctype));

		return items
			.map(
				(a) => `
				<button class="iisc-btn ${a.primary ? "iisc-btn-primary" : "iisc-btn-outline"}" data-new="${a.doctype}">
					${a.primary ? iiscSvg("plus") : ""}${a.label}
				</button>`
			)
			.join("");
	},

	shell() {
		const name = frappe.utils.escape_html(
			(frappe.boot.user && frappe.boot.user.first_name) || frappe.session.user_fullname || ""
		);
		return `
			<div class="iisc-dash">
				<div class="iisc-dash-head">
					<div>
						<h2 class="iisc-dash-title">${this.greeting()}, ${name}!</h2>
						<p class="iisc-dash-subtitle">${__("Here's what's happening across HR today.")}</p>
					</div>
					<div class="iisc-dash-actions">${this.actions()}</div>
				</div>
				<div class="iisc-dash-cards"><div class="iisc-dash-loading">${__("Loading…")}</div></div>
			</div>`;
	},

	fill(root, d) {
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
		this.data = d;
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
			const btn = ev.target.closest("[data-new]");
			if (btn) return frappe.new_doc(btn.dataset.new);
			const card = ev.target.closest("[data-card]");
			if (card) this.open(card.dataset.card);
		});
		root.addEventListener("keydown", (ev) => {
			const card = ev.target.closest("[data-card]");
			if (card && (ev.key === "Enter" || ev.key === " ")) {
				ev.preventDefault();
				this.open(card.dataset.card);
			}
		});
	},

	render() {
		if (!this.isAppsScreen() || this.loading) return;
		// Inserted as a sibling *before* .desktop-container (a centred flex
		// row that holds Frappe's app icons) so the icons stay untouched.
		const container = document.querySelector("#page-desktop .desktop-container");
		const wrapper = container.parentElement;
		let root = wrapper.querySelector(":scope > .iisc-dash");
		if (!root) {
			container.insertAdjacentHTML("beforebegin", this.shell());
			root = wrapper.querySelector(":scope > .iisc-dash");
			this.bind(root);
		}

		this.loading = true;
		frappe
			.call({ method: "iisc_theme.api.get_hr_dashboard", freeze: false })
			.then((r) => r.message && this.fill(root, r.message))
			.catch(() => {
				const cards = root.querySelector(".iisc-dash-cards");
				if (cards) cards.innerHTML = `<div class="iisc-dash-loading">${__("Could not load HR numbers.")}</div>`;
			})
			.finally(() => (this.loading = false));
	},

	init() {
		this.render();
		if (window.frappe && frappe.router) {
			frappe.router.on("change", () => setTimeout(() => this.render(), 300));
		}
	},
};

$(document).ready(() =>
	setTimeout(() => {
		iiscFooter.init();
		iiscDashboard.init();
	}, 200)
);
