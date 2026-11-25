// =====================================================================
// IISc website theme — careers page (/jobs)
//  - IISc header, hero and footer around HRMS's job list
//  - sample openings while the site has no data (iisc_theme.web.careers_context)
// Only runs on /jobs pages; the rest of the website is untouched.
// =====================================================================

function iiscCareers() {
	const path = (document.body.dataset.path || "").replace(/^\/+/, "");
	if (!/^jobs(\/|$)/.test(path)) return;

	const esc = (v) =>
		String(v === null || v === undefined ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
	const t = (s) => (window.__ ? __(s) : s);

	const ICON = {
		pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
		branch: '<path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
		money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
		clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
		users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
	};
	const svg = (n, s = 15) =>
		`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

	// IISc fonts (the desk bundle loads them on /desk; the website needs its own link)
	if (!document.getElementById("iisc-fonts")) {
		const l = document.createElement("link");
		l.id = "iisc-fonts";
		l.rel = "stylesheet";
		l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Source+Sans+3:wght@300..800&display=swap";
		document.head.appendChild(l);
	}

	document.body.classList.add("iisc-careers");

	// ---------- header ----------
	const brand = document.querySelector(".navbar .navbar-brand");
	if (brand) {
		brand.innerHTML = `
			<span class="iisc-web-logo">IISc</span>
			<span class="iisc-web-brand"><b>${t("Indian Institute of Science")}</b><small>${t("Careers")}</small></span>`;
	}

	// ---------- hero (list page only) ----------
	const isList = path === "jobs" || path === "jobs/";
	const main = document.querySelector("#page-index main.container, .page-content-wrapper main.container");
	if (isList && main && !document.querySelector(".iisc-careers-hero")) {
		main.insertAdjacentHTML(
			"beforebegin",
			`<section class="iisc-careers-hero">
				<div class="container">
					<span class="iisc-careers-tag">${t("Careers at IISc")}</span>
					<h1>${t("Shape the future of science and engineering")}</h1>
					<p>${t("Faculty, research, technical and administrative positions across the Indian Institute of Science, Bengaluru.")}</p>
					<div class="iisc-careers-stats">
						<div><b data-stat="openings">—</b><span>${t("Open positions")}</span></div>
						<div><b data-stat="departments">—</b><span>${t("Departments hiring")}</span></div>
						<div><b data-stat="vacancies">—</b><span>${t("Vacancies")}</span></div>
					</div>
				</div>
			</section>`
		);
	}

	// ---------- footer ----------
	const powered = document.querySelector(".web-footer .footer-powered");
	if (powered) powered.innerHTML = `<span>© ${new Date().getFullYear()} ${t("Indian Institute of Science, Bengaluru")} | ${t("Design")}: ITChamps</span>`;

	if (!isList) return;

	// ---------- sample openings ----------
	const SAMPLE = [
		{ title: "Project Scientist – High Performance Computing", dept: "Computational & Data Sciences", type: "Contract", loc: "Bengaluru (Main Campus)", pay: "₹ 78,000 – ₹ 1,12,000 / month", posted: 3, closes: 21, apps: 128 },
		{ title: "Research Associate – Quantum Materials", dept: "Physics", type: "Full-time", loc: "Bengaluru (Main Campus)", pay: "₹ 58,000 – ₹ 67,000 / month", posted: 5, closes: 18, apps: 94 },
		{ title: "Technical Officer – Wind Tunnel Facility", dept: "Aerospace Engineering", type: "Full-time", loc: "Bengaluru (Main Campus)", pay: "₹ 56,100 – ₹ 1,77,500 / month", posted: 8, closes: 14, apps: 61 },
		{ title: "Junior Research Fellow – Structural Biology", dept: "Biochemistry", type: "Contract", loc: "Bengaluru (Main Campus)", pay: "₹ 37,000 / month", posted: 2, closes: 25, apps: 212 },
		{ title: "Assistant Registrar", dept: "Administration", type: "Full-time", loc: "Bengaluru (Main Campus)", pay: "Level 10 (₹ 56,100 – ₹ 1,77,500)", posted: 10, closes: 9, apps: 47 },
		{ title: "Field Research Assistant – Climate Studies", dept: "Divecha Centre for Climate Change", type: "Part-time", loc: "Challakere Campus", pay: "₹ 25,000 / month", posted: 1, closes: 30, apps: 33 },
	];

	const resultsCol = document.querySelector(".page_content .col-lg-9");
	const grid = resultsCol && [...resultsCol.children].filter((e) => e.classList.contains("row")).pop();
	const count = resultsCol && resultsCol.querySelector("p.text-secondary");
	const filtersCol = document.querySelector(".page_content .col-3.text-15");
	const realCards = grid ? grid.querySelectorAll(".card").length : 0;

	const badge = (type) =>
		type === "Full-time" ? "full-time-badge" : type === "Part-time" ? "part-time-badge" : "other-badge";

	const card = (j) => `
		<div class="col-md-6 mb-6">
			<div class="card border h-100 flex flex-col iisc-job iisc-job-sample" role="button" tabindex="0">
				<div class="iisc-job-body">
					<div class="iisc-job-top">
						<h4 class="jobs-page">${esc(j.title)}</h4>
						<span class="badge ${badge(j.type)}">${esc(t(j.type))}</span>
					</div>
					<div class="iisc-job-co"><b>${t("Indian Institute of Science")}</b> · ${t("posted {0} days ago").replace("{0}", j.posted)}</div>
					<div class="iisc-job-meta">
						<span>${svg("pin")}${esc(j.loc)}</span>
						<span>${svg("branch")}${esc(j.dept)}</span>
						<span>${svg("money")}${esc(j.pay)}</span>
					</div>
				</div>
				<div class="job-card-footer iisc-job-foot">
					<span>${svg("users", 14)}${j.apps} ${t("applications")}</span>
					<span>${svg("clock", 14)}${t("Closes in {0} days").replace("{0}", j.closes)}</span>
				</div>
			</div>
		</div>`;

	const notice = () => {
		let n = document.querySelector(".iisc-web-toast");
		if (!n) {
			n = document.createElement("div");
			n.className = "iisc-web-toast";
			document.body.appendChild(n);
		}
		n.textContent = t("This is a sample opening — real positions appear here once they are published.");
		n.classList.add("show");
		clearTimeout(n._t);
		n._t = setTimeout(() => n.classList.remove("show"), 3200);
	};

	const sampleFilters = () => {
		if (!filtersCol || filtersCol.querySelector(".form-check")) return; // real filters exist
		const group = (title, items) => `
			<div class="iisc-filter-group">
				<p class="iisc-filter-title">${esc(t(title))}</p>
				${items
					.map(
						(i) => `<label class="form-check iisc-filter-item"><input type="checkbox" class="form-check-input" data-sample-filter="${esc(i)}"> <span>${esc(t(i))}</span></label>`
					)
					.join("")}
			</div>`;
		filtersCol.insertAdjacentHTML(
			"beforeend",
			group("Department", ["Computational & Data Sciences", "Physics", "Aerospace Engineering", "Biochemistry", "Administration"]) +
				group("Employment Type", ["Full-time", "Contract", "Part-time"]) +
				group("Location", ["Bengaluru (Main Campus)", "Challakere Campus"])
		);
	};

	const renderSamples = () => {
		const q = (new URLSearchParams(location.search).get("query") || "").toLowerCase();
		const picked = [...document.querySelectorAll("[data-sample-filter]:checked")].map((c) => c.dataset.sampleFilter);
		const list = SAMPLE.filter(
			(j) =>
				(!q || `${j.title} ${j.dept} ${j.loc}`.toLowerCase().includes(q)) &&
				(!picked.length || picked.some((p) => [j.dept, j.type, j.loc].includes(p)))
		);
		grid.innerHTML = list.length ? list.map(card).join("") : `<div class="col-12 iisc-job-empty">${t("No openings match your search.")}</div>`;
		if (count) count.textContent = t("Showing {0} results").replace("{0}", list.length);
	};

	const fillStats = (s) => {
		Object.entries(s).forEach(([k, v]) => {
			const el = document.querySelector(`[data-stat="${k}"]`);
			if (el) el.textContent = v;
		});
	};

	const start = (ctx) => {
		if (ctx && ctx.demo && grid && !realCards) {
			fillStats({ openings: SAMPLE.length, departments: 6, vacancies: 14 });
			sampleFilters();
			renderSamples();
			grid.addEventListener("click", (e) => e.target.closest(".iisc-job-sample") && notice());
			filtersCol && filtersCol.addEventListener("change", (e) => e.target.matches("[data-sample-filter]") && renderSamples());
		} else if (ctx) {
			fillStats({ openings: ctx.openings, departments: ctx.departments, vacancies: ctx.vacancies || ctx.openings });
		}
	};

	if (window.frappe && frappe.call) {
		Promise.resolve(frappe.call({ method: "iisc_theme.web.careers_context", type: "GET" }))
			.then((r) => start(r && r.message))
			.catch(() => start(null));
	}
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iiscCareers);
else iiscCareers();
