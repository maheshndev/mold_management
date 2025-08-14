frappe.pages['daily-production-rep'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Daily Production Report',
		single_column: true
	});
	 $(frappe.render_template("daily_production_report", {})).appendTo(page.body);
}