app_name = "iisc_theme"
app_title = "IISc Theme"
app_publisher = "ITChamps Software Pvt Ltd"
app_description = "IISc branded Desk theme for Frappe HR v16"
app_email = "nusrath@itchamps.com"
app_license = "mit"

required_apps = ["frappe", "hrms"]

# ------------------------------------------------------------------
# Desk assets (bundled by esbuild on Frappe Cloud deploy -> hashed
# file names, so no manual ?v= cache-busting is needed)
# ------------------------------------------------------------------
app_include_css = ["iisc_theme.bundle.css", "iisc_modules.bundle.css"]
app_include_js = ["iisc_theme.bundle.js", "iisc_modules.bundle.js"]

# Website / login page assets
web_include_css = ["iisc_theme.bundle.css", "iisc_web.bundle.css"]
web_include_js = ["iisc_web.bundle.js"]

website_context = {
	"favicon": "/assets/iisc_theme/images/favicon.png",
	"splash_image": "/assets/iisc_theme/images/iisc-logo.svg",
}

# Theme-only app: no Apps-screen icon needed.
# add_to_apps_screen = []
