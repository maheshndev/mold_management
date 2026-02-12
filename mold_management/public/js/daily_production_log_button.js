frappe.ui.form.on("Job Card", {
	refresh: function (frm) {
		if (!frm.is_new() && frm.doc.docstatus < 2) {
			frm.add_custom_button(
				__("Add Production Log"),
				function () {
					open_production_log_dialog(frm.doc.name);
				},
				__("Actions"),
			);
		}
	},
});

frappe.ui.form.on("Work Order", {
	refresh: function (frm) {
		if (!frm.is_new() && frm.doc.docstatus < 2) {
			frm.add_custom_button(
				__("Add Production Log"),
				function () {
					frappe.call({
						method: "mold_management.api.production_log_api.get_job_cards_for_work_order",
						args: {
							work_order: frm.doc.name,
						},
						callback: function (r) {
							if (r.message && r.message.length > 0) {
								if (r.message.length === 1) {
									open_production_log_dialog(r.message[0].name);
								} else {
									let d = new frappe.ui.Dialog({
										title: __("Select Job Card"),
										fields: [
											{
												label: __("Job Card"),
												fieldname: "job_card",
												fieldtype: "Select",
												options: r.message.map((jc) => ({
													label: `${jc.name} (${jc.operation} - ${jc.workstation || ""})`,
													value: jc.name,
												})),
												reqd: 1,
											},
										],
										primary_action_label: __("Next"),
										primary_action(values) {
											d.hide();
											open_production_log_dialog(values.job_card);
										},
									});
									d.show();
								}
							} else {
								frappe.msgprint(
									__("No active Job Cards found for this Work Order."),
								);
							}
						},
					});
				},
				__("Actions"),
			);
		}
	},
});

function open_production_log_dialog(job_card) {
	let d = new frappe.ui.Dialog({
		title: __("Add Production Log for {0}", [job_card]),
		fields: [
			{
				label: __("Operator"),
				fieldname: "operator",
				fieldtype: "Link",
				options: "Employee",
				description: __("Select operator name"),
			},
			{
				label: __("Time Slot"),
				fieldname: "time_slot",
				fieldtype: "Data",
				reqd: 1,
				description: __("e.g., 08-09"),
			},
			{
				label: __("OK Shots"),
				fieldname: "ok_shots",
				fieldtype: "Int",
				default: 0,
			},
			{
				label: __("Rej Shots"),
				fieldname: "rej_shots",
				fieldtype: "Int",
				default: 0,
			},
			{
				label: __("Rej Code"),
				fieldname: "rej_code",
				fieldtype: "Data",
			},
			{
				label: __("Remarks"),
				fieldname: "remarks",
				fieldtype: "Small Text",
			},
		],
		primary_action_label: __("Add"),
		primary_action(values) {
			frappe.call({
				method: "mold_management.api.production_log_api.add_production_log_entry",
				args: {
					job_card: job_card,
					operator: values.operator,
					time_slot: values.time_slot,
					ok_shots: values.ok_shots,
					rej_shots: values.rej_shots,
					rej_code: values.rej_code,
					remarks: values.remarks,
				},

				callback: function (r) {
					if (r.message) {
						frappe.show_alert({
							message: __("Production Log {0} updated", [r.message]),
							indicator: "green",
						});
						d.hide();
					}
				},
			});
		},
	});
	d.show();
}
