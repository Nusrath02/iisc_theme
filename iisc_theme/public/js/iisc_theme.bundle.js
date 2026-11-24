// =====================================================================
// IISc Theme — Frappe v16 (16.60) Desk
// Footer pinned to the bottom of the screen on every Desk page (desktop).
//  - Appended to <body>, position: fixed (see bundle.css §5)
//  - left/width follow .main-section (sidebar collapse/expand, resize)
//  - sets --iisc-footer-h so .main-section reserves space for it
//  - hidden below 768px by CSS (v16 shows its own mobile bottom nav)
// =====================================================================

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

$(document).ready(() => setTimeout(() => iiscFooter.init(), 200));
