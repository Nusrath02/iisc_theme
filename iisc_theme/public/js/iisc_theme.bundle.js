// =====================================================================
// IISc Theme — Frappe v16 Desk
// =====================================================================

// ---------- 1. Load Source Sans 3 font (once) ----------
(function loadIIScFont() {
	if (document.getElementById("iisc-font")) return;
	const link = document.createElement("link");
	link.id = "iisc-font";
	link.rel = "stylesheet";
	link.href =
		"https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap";
	document.head.appendChild(link);
})();

// ---------- 2. IISc footer ----------
function iiscRenderFooter() {
	// Frappe keeps old pages hidden in the DOM — target only the current page
	const page = window.frappe && frappe.container && frappe.container.page;
	if (!page) return;
	const main = page.querySelector(".layout-main-section-wrapper") || page;
	if (main.querySelector(".iisc-footer")) return;

	const footer = document.createElement("div");
	footer.className = "iisc-footer";
	footer.innerHTML = `
		<span>© ${new Date().getFullYear()} Indian Institute of Science, Bengaluru | Design: ITChamps</span>
		<img src="/assets/iisc_theme/images/iisc-logo.svg" alt="IISc" onerror="this.style.display='none'">
	`;
	main.appendChild(footer);
}

$(document).ready(() => setTimeout(iiscRenderFooter, 300));

if (window.frappe && frappe.router) {
	frappe.router.on("change", () => setTimeout(iiscRenderFooter, 300));
}
