// Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Mold Maintenance Order", {
	mold_maintenance: (frm) => {
		frm.set_query("task", function (doc) {
			return {
				query: "mold_management.mold_management.doctype.mold_maintenance_order.mold_maintenance_order.get_maintenance_tasks",
				filters: {
					mold_maintenance: doc.mold_maintenance,
				},
			};
		});
	},
});
