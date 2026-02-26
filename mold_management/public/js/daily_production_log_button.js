frappe.ui.form.on("Job Card", {
	refresh: function (frm) {
		const active_statuses = ["Open", "Work In Progress"];
		if (
			frm.doc.docstatus === 1 &&
			(active_statuses.includes(frm.doc.status) || !frm.doc.status)
		) {
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
		const active_statuses = ["Not Started", "In Process"];
		if (frm.doc.docstatus === 1 && active_statuses.includes(frm.doc.status)) {
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
	let current_template = null;
	let is_loading = false;
	let d = new frappe.ui.Dialog({
		title: __("Add Production Log for {0}", [job_card]),
		fields: [
			{
				fieldtype: "Section Break",
				columns: 2,
			},
			{
				label: __("Operator"),
				fieldname: "operator",
				fieldtype: "Link",
				options: "Employee",
				description: __("Select operator name"),
			},
			{
				fieldtype: "Column Break",
			},
			{
				label: __("Time Slot"),
				fieldname: "time_slot",
				fieldtype: "Link",
				options: "Production Time Slots",
				reqd: 1,
				description: __("Select time slot"),
			},
			{
				fieldtype: "Section Break",
				columns: 2,
			},
			{
				label: __("OK Shots"),
				fieldname: "ok_shots",
				fieldtype: "Int",
				default: 0,
			},
			{
				fieldtype: "Column Break",
			},
			{
				label: __("Rejection Shots"),
				fieldname: "rej_shots",
				fieldtype: "Int",
				default: 0,
			},
			{
				fieldtype: "Section Break",
				columns: 2,
			},
			{
				label: __("Rejection Code"),
				fieldname: "rej_code",
				fieldtype: "Link",
				options: "Quality Inspection Parameter",
			},
			{
				fieldtype: "Column Break",
			},
			{
				label: __("Remarks"),
				fieldname: "remarks",
				fieldtype: "Small Text",
			},
			{
				fieldtype: "Section Break",
				label: __("Quality Inspection"),
			},
			{
				label: __("Create Quality Inspection"),
				fieldname: "create_qi",
				fieldtype: "Check",
				default: 0,
			},
			{
				label: __("Quality Inspection Template"),
				fieldname: "qi_template",
				fieldtype: "Link",
				options: "Quality Inspection Template",
				depends_on: "eval:doc.create_qi == 1",
			},
			{
				label: __("QI Readings"),
				fieldname: "qi_readings",
				fieldtype: "Table",
				depends_on: "eval:doc.create_qi == 1",
				fields: [
					{
						label: __("Parameter"),
						fieldname: "specification",
						fieldtype: "Link",
						options: "Quality Inspection Parameter",
						in_list_view: 1,
						columns: 3,
						read_only: 1,
					},
					{
						label: __("Status"),
						fieldname: "status",
						fieldtype: "Select",
						options: ["Accepted", "Rejected"],
						in_list_view: 1,
						columns: 2,
						default: "Accepted",
					},
					{
						label: __("Num"),
						fieldname: "is_numeric",
						fieldtype: "Check",
						in_list_view: 1,
						columns: 1,
						read_only: 1,
					},
					{
						label: __("Min"),
						fieldname: "min_value",
						fieldtype: "Data",
						in_list_view: 1,
						columns: 1,
						read_only: 1,
					},
					{
						label: __("Max"),
						fieldname: "max_value",
						fieldtype: "Data",
						in_list_view: 1,
						columns: 1,
						read_only: 1,
					},
					{
						label: __("Reading"),
						fieldname: "reading_value",
						fieldtype: "Data",
						columns: 4,
						in_list_view: 1,
					},
				],
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
					create_qi: values.create_qi,
					qi_template: values.qi_template,
					qi_readings: values.qi_readings,
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

	// Handle "Create Quality Inspection" toggle
	d.fields_dict.create_qi.df.onchange = () => {
		console.log("Create QI changed:", d.get_value("create_qi"));
		if (d.get_value("create_qi")) {
			let template = d.get_value("qi_template");
			if (template) {
				fetch_and_render_parameters(template);
			} else {
				console.log("Fetching default item QI details...");
				frappe.call({
					method: "mold_management.api.production_log_api.get_item_qi_details",
					args: { job_card: job_card },
					callback: function (r) {
						if (r.message && r.message.template) {
							// d.set_value triggers the onchange automatically for Links
							d.set_value("qi_template", r.message.template);
						}
					},
				});
			}
		} else {
			current_template = null;
			d.set_value("qi_readings", []);
		}
	};

	// Handle Template Change
	d.fields_dict.qi_template.df.onchange = () => {
		let template = d.get_value("qi_template");
		console.log("QI Template changed:", template);
		if (template) {
			fetch_and_render_parameters(template);
		} else {
			current_template = null;
			d.set_value("qi_readings", []);
		}
	};

	function fetch_and_render_parameters(template) {
		if (!template || template === current_template || is_loading) return;

		console.log("Fetching parameters for:", template);
		is_loading = true;
		current_template = template;

		frappe.call({
			method: "mold_management.api.production_log_api.get_qi_template_parameters",
			args: { template: template },
			callback: function (r) {
				is_loading = false;
				console.log("Template Parameters result:", r.message);
				if (r.message && Array.isArray(r.message)) {
					render_qi_readings(r.message);
				} else {
					current_template = null;
					d.set_value("qi_readings", []);
				}
			},
		});
	}

	function render_qi_readings(parameters) {
		console.log("Rendering parameters in grid:", parameters);
		if (!parameters || !Array.isArray(parameters)) return;

		let field = d.get_field("qi_readings");
		if (!field || !field.grid) {
			console.error("QI Readings grid not found!");
			return;
		}

		let grid = field.grid;

		// Clear existing rows
		grid.df.data = [];
		grid.refresh();

		// Manually push each row to the grid data
		parameters.forEach((p) => {
			let spec = p.specification || p.parameter_name || p.parameter || p.name;
			let numeric = p.numeric || p.is_numeric || p.parameter_type === "Numeric" ? 1 : 0;

			// Create a generic row object
			let row = {
				specification: spec,
				status: "Accepted",
				is_numeric: numeric,
				reading_value: "",
				min_value: p.min_value || "",
				max_value: p.max_value || "",
				name: frappe.utils.get_random(10), // Temporary name
			};

			grid.df.data.push(row);
		});

		// Refresh the grid to show the newly added data
		grid.refresh();

		// Add hover title to specification column for tooltips
		setTimeout(() => {
			grid.wrapper.find(".grid-row").each(function () {
				let $row = $(this);
				let $spec_cell = $row.find('[data-fieldname="specification"]');
				let full_text = $spec_cell.text().trim();
				if (full_text) {
					$spec_cell.attr("title", full_text);
					// Also try to find the inner static-area if present
					$spec_cell.find(".static-area").attr("title", full_text);
				}
			});
		}, 200);

		console.log("Grid replacement complete for " + parameters.length + " parameters");
	}

	// Fetch and display last time slot
	frappe.call({
		method: "mold_management.api.production_log_api.get_last_time_slot",
		args: {
			job_card: job_card,
		},
		callback: function (r) {
			if (r.message) {
				let description = __("Last Time Slot: <b>{0}</b>", [r.message]);
				d.set_df_property("time_slot", "description", description);

				// Fallback for some versions of Frappe
				if (d.fields_dict.time_slot && d.fields_dict.time_slot.set_description) {
					d.fields_dict.time_slot.set_description(description);
				}
			}
		},
	});

	d.show();

	// Force dialog width expansion aggressively
	$(d.wrapper).addClass("modal-xl"); // Standard Bootstrap XL class
	$(d.wrapper).find(".modal-dialog").css({
		"min-width": "95vw",
		width: "95%",
	});
}
