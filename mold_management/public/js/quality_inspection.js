frappe.ui.form.on("Quality Inspection", {
	refresh: function (frm) {
		// If template is already set but readings are empty or missing custom fields, trigger fetch
		if (frm.is_new() && frm.doc.quality_inspection_template) {
			frm.trigger("quality_inspection_template");
		}
	},

	quality_inspection_template: function (frm) {
		if (frm.doc.quality_inspection_template) {
			// First call the standard ERPNext method to get basic details if readings are empty
			if (!frm.doc.readings || frm.doc.readings.length === 0) {
				frappe.call({
					method: "get_item_specification_details",
					doc: frm.doc,
					callback: function () {
						fetch_custom_fields(frm);
					},
				});
			} else {
				fetch_custom_fields(frm);
			}
		}
	},
});

function fetch_custom_fields(frm) {
	if (!frm.doc.quality_inspection_template) return;

	frappe.call({
		method: "yash_customization.api.production_log_api.get_qi_template_parameters",
		args: {
			template: frm.doc.quality_inspection_template,
		},
		callback: function (r) {
			if (r.message && Array.isArray(r.message)) {
				let params_map = {};
				r.message.forEach((p) => {
					params_map[p.specification] = p;
				});

				let readings_updated = false;
				// Update each row in the readings table with custom field values
				frm.doc.readings.forEach((row) => {
					let custom_data = params_map[row.specification];
					if (custom_data) {
						// Only set if field is empty to avoid overwriting manual changes
						if (!row.sample_type) {
							row.sample_type = custom_data.sample_type;
							readings_updated = true;
						}
						if (!row.sample_qty) {
							row.sample_qty = custom_data.sample_qty;
							readings_updated = true;
						}
						if (!row.criteria_type) {
							row.criteria_type = custom_data.criteria_type;
							readings_updated = true;
						}
						if (!row.avg) {
							row.avg = custom_data.avg;
							readings_updated = true;
						}
					}
				});

				if (readings_updated) {
					frm.refresh_field("readings");
				}
			}
		},
	});
}
