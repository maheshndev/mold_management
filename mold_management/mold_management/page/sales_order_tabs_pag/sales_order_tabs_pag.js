frappe.pages['sales-order-tabs-pag'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Sales Order Tabs Page',
		single_column: true
	});
}