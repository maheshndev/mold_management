frappe.ui.form.on("Quality Inspection", {
	quality_inspection_template: function (frm) {
		if (frm.doc.quality_inspection_template) {
			// First call the standard ERPNext method to get basic details
			frappe.call({
				method: "get_item_specification_details",
				doc: frm.doc,
				callback: function () {
					// After ERPNext fills the readings, we fetch the custom fields (Sample Type, Sample Qty, etc.)
					frappe.call({
						method: "mold_management.api.production_log_api.get_qi_template_parameters",
						args: {
							template: frm.doc.quality_inspection_template,
						},
						callback: function (r) {
							if (r.message && Array.isArray(r.message)) {
								let params_map = {};
								r.message.forEach((p) => {
									params_map[p.specification] = p;
								});

								// Update each row in the readings table with custom field values
								frm.doc.readings.forEach((row) => {
									let custom_data = params_map[row.specification];
									if (custom_data) {
										row.sample_type = custom_data.sample_type;
										row.sample_qty = custom_data.sample_qty;
										row.criteria_type = custom_data.criteria_type;
										row.avg = custom_data.avg;
									}
								});

								frm.refresh_field("readings");
							}
						},
					});
				},
			});
		}
	},
});
