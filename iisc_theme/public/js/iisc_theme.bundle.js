// =====================================================================
// IISc Theme — Frappe v16 (16.60) Desk
//
// Footer is rendered into v16's native <footer> inside .main-section
// (full content width, one instance, outside individual pages).
//
// Hidden on:
//   - Apps screen  (route [""])
//   - Workspaces   (route ["Workspaces", ...]) — Frappe core fixes
//     [data-page-route="Workspaces"] .layout-main to 100vh and lets the
//     cards overflow, so a footer there would sit behind the cards.
// Verified on iiscdemo.frappe.cloud: list, form, report, dashboard OK.
// =====================================================================

const IISC_HIDE_FOOTER_ON = ["", "desktop", "workspaces"];

function iiscFooterAllowed() {
	const route = (window.frappe && frappe.get_route && frappe.get_route()) || [""];
	const first = String(route[0] || "").toLowerCase();
	return !IISC_HIDE_FOOTER_ON.includes(first);
}

function iiscRenderFooter() {
	const host = document.querySelector(".main-section > footer");
	if (!host) return;

	let footer = host.querySelector(".iisc-footer");
	if (!footer) {
		footer = document.createElement("div");
		footer.className = "iisc-footer";
		footer.innerHTML = `
			<span>© ${new Date().getFullYear()} Indian Institute of Science, Bengaluru | Design: ITChamps</span>
			<img src="/assets/iisc_theme/images/iisc-logo.svg" alt="IISc" onerror="this.style.display='none'">
		`;
		host.appendChild(footer);
	}

	footer.style.display = iiscFooterAllowed() ? "" : "none";
}

$(document).ready(() => setTimeout(iiscRenderFooter, 200));

if (window.frappe && frappe.router) {
	frappe.router.on("change", () => setTimeout(iiscRenderFooter, 200));
}
