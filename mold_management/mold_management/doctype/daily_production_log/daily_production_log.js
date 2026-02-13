frappe.ui.form.on("Daily Production Log", {
	refresh(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__("View Report"), () => {
				frappe.set_route("daily-production-rep", frm.doc.name);
			});
		}
	},
});
