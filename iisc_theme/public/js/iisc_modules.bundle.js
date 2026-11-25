// =====================================================================
// IISc module dashboards — entry bundle
// core.js mounts a custom dashboard in place of a module's workspace
// body (Frappe's module menu on the left stays) and on the module's
// "Dashboard" page. Each module has its own JS file under iisc_modules/
// and its own Python file under iisc_theme/module_dashboards/.
// =====================================================================
import "./iisc_modules/core.js";
import "./iisc_modules/hr_setup.js";
import "./iisc_modules/shift_attendance.js";
import "./iisc_modules/leaves.js";
import "./iisc_modules/expenses.js";
import "./iisc_modules/payroll.js";
import "./iisc_modules/performance.js";
import "./iisc_modules/tenure.js";
import "./iisc_modules/recruitment.js";
import "./iisc_modules/tax_benefits.js";
