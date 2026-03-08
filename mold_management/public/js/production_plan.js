frappe.ui.form.on("Production Plan", {
	refresh: function (frm) {
		add_manage_ops_actions(frm, "po_items");
		add_manage_ops_actions(frm, "sub_assembly_items");
	},
});

function add_manage_ops_actions(frm, field_name) {
	let grid = frm.fields_dict[field_name].grid;

	// Add pencil icon to each row
	grid.on_grid_refresh = function () {
		grid.add_action_icon("pencil", function (cdt, cdn) {
			show_operations_popup(frm, cdt, cdn);
		});
	};
}

frappe.ui.form.on("Production Plan Item", {
	bom_no: function (frm, cdt, cdn) {
		fetch_bom_operations(frm, cdt, cdn);
	},
	form_render: function (frm, cdt, cdn) {
		render_operations_html(frm, cdt, cdn);
	},
});

frappe.ui.form.on("Production Plan Sub Assembly Item", {
	bom_no: function (frm, cdt, cdn) {
		fetch_bom_operations(frm, cdt, cdn);
	},
	form_render: function (frm, cdt, cdn) {
		render_operations_html(frm, cdt, cdn);
	},
});

function show_operations_popup(frm, cdt, cdn) {
	let row = frappe.get_doc(cdt, cdn);
	let ops = [];
	try {
		ops = JSON.parse(row.operations_data || "[]");
	} catch (e) {
		ops = [];
	}

	let d = new frappe.ui.Dialog({
		title: __("Operations for {0}", [row.item_code]),
		fields: [
			{
				fieldname: "fetch_from_bom",
				fieldtype: "Button",
				label: __("Fetch from BOM"),
				click: function () {
					fetch_bom_operations_for_popup(frm, cdt, cdn, d);
				},
			},
			{
				fieldname: "ops_html",
				fieldtype: "HTML",
			},
		],
		primary_action_label: __("Update"),
		primary_action: function () {
			frappe.model.set_value(cdt, cdn, "operations_data", JSON.stringify(ops));
			render_operations_html(frm, cdt, cdn, true);
			d.hide();
		},
	});

	render_ops_in_dialog(ops, d, frm, cdt, cdn);
	d.show();
}

function render_ops_in_dialog(ops, d, frm, cdt, cdn) {
	let wrapper = $(d.fields_dict.ops_html.wrapper).empty();
	if (ops.length === 0) {
		wrapper.html(
			'<p class="text-muted">No operations found. Click "Fetch from BOM" to load them.</p>',
		);
		return;
	}

	let html = `
        <table class="table table-bordered table-condensed">
        <thead>
            <tr>
                <th style="width: 30%">Operation</th>
                <th style="width: 35%">Workstation</th>
                <th style="width: 35%">Mould</th>
            </tr>
        </thead>
        <tbody>`;

	ops.forEach((op, idx) => {
		html += `<tr data-idx="${idx}">
            <td style="vertical-align: middle;"><b>${op.operation || ""}</b></td>
            <td class="ws-col"></td>
            <td class="mould-col"></td>
        </tr>`;
	});

	html += `</tbody></table>`;
	wrapper.html(html);

	ops.forEach((op, idx) => {
		let tr = wrapper.find(`tr[data-idx="${idx}"]`);

		let ws_ctrl = frappe.ui.form.make_control({
			df: {
				fieldtype: "Link",
				options: "Workstation",
				fieldname: "workstation_" + idx,
				onchange: function () {
					ops[idx].workstation = this.get_value();
				},
			},
			parent: tr.find(".ws-col"),
			only_input: true,
		});
		ws_ctrl.make_input();
		ws_ctrl.set_value(op.workstation);

		let mould_ctrl = frappe.ui.form.make_control({
			df: {
				fieldtype: "Link",
				options: "Mould",
				fieldname: "mould_" + idx,
				onchange: function () {
					ops[idx].mould = this.get_value();
				},
			},
			parent: tr.find(".mould-col"),
			only_input: true,
		});
		mould_ctrl.make_input();
		mould_ctrl.set_value(op.mould);
	});
}

function fetch_bom_operations_for_popup(frm, cdt, cdn, d) {
	let row = frappe.get_doc(cdt, cdn);
	if (!row.bom_no) {
		frappe.msgprint(__("Please select a BOM first."));
		return;
	}

	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "BOM",
			name: row.bom_no,
		},
		callback: function (r) {
			if (r.message && r.message.operations) {
				let ops = r.message.operations.map((op) => ({
					operation: op.operation,
					workstation: op.workstation,
					mould: "",
				}));
				render_ops_in_dialog(ops, d, frm, cdt, cdn);
				frappe.model.set_value(cdt, cdn, "operations_data", JSON.stringify(ops));
				render_operations_html(frm, cdt, cdn, true);
			}
		},
	});
}

function fetch_bom_operations(frm, cdt, cdn, force_render = false) {
	let row = frappe.get_doc(cdt, cdn);
	if (!row.bom_no) {
		frappe.model.set_value(cdt, cdn, "operations_data", "[]");
		return;
	}

	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "BOM",
			name: row.bom_no,
		},
		callback: function (r) {
			if (r.message && r.message.operations) {
				let ops = r.message.operations.map((op) => ({
					operation: op.operation,
					workstation: op.workstation,
					mould: "",
				}));
				frappe.model.set_value(cdt, cdn, "operations_data", JSON.stringify(ops));
				if (force_render) {
					render_operations_html(frm, cdt, cdn, true);
				}
			}
		},
	});
}

function render_operations_html(frm, cdt, cdn, skip_auto_fetch = false) {
	let row = frappe.get_doc(cdt, cdn);
	let field_name = cdt === "Production Plan Item" ? "po_items" : "sub_assembly_items";
	let grid_dict = frm.fields_dict[field_name];

	if (!grid_dict || !grid_dict.grid) return;
	let grid_row = grid_dict.grid.grid_rows_by_docname[cdn];
	if (!grid_row || !grid_row.grid_form) return;

	let html_field = grid_row.grid_form.fields_dict.operations_html;
	if (!html_field) return;

	let ops = [];
	try {
		ops = JSON.parse(row.operations_data || "[]");
	} catch (e) {
		ops = [];
	}

	if (ops.length === 0 && row.bom_no && !skip_auto_fetch) {
		fetch_bom_operations(frm, cdt, cdn, true);
		return;
	}

	let wrapper = $(html_field.wrapper).empty();

	if (ops.length === 0) {
		wrapper.html(
			'<p class="text-muted">No operations found. Use the pencil icon to manage.</p>',
		);
		return;
	}

	let html = `
        <label class="control-label">Operations</label>
        <table class="table table-bordered table-condensed">
        <thead>
            <tr>
                <th style="width: 30%">Operation</th>
                <th style="width: 35%">Workstation</th>
                <th style="width: 35%">Mould</th>
            </tr>
        </thead>
        <tbody>`;

	ops.forEach((op, idx) => {
		html += `<tr data-idx="${idx}">
            <td style="vertical-align: middle;"><b>${op.operation || ""}</b></td>
            <td class="ws-col"></td>
            <td class="mould-col"></td>
        </tr>`;
	});

	html += `</tbody></table>`;
	let table = $(html).appendTo(wrapper);

	ops.forEach((op, idx) => {
		let tr = wrapper.find(`tr[data-idx="${idx}"]`);

		let ws_ctrl = frappe.ui.form.make_control({
			df: {
				fieldtype: "Link",
				options: "Workstation",
				fieldname: "form_workstation_" + idx,
				onchange: function () {
					ops[idx].workstation = this.get_value();
					frappe.model.set_value(cdt, cdn, "operations_data", JSON.stringify(ops));
				},
			},
			parent: tr.find(".ws-col"),
			only_input: true,
		});
		ws_ctrl.make_input();
		ws_ctrl.set_value(op.workstation);

		let mould_ctrl = frappe.ui.form.make_control({
			df: {
				fieldtype: "Link",
				options: "Mould",
				fieldname: "form_mould_" + idx,
				onchange: function () {
					ops[idx].mould = this.get_value();
					frappe.model.set_value(cdt, cdn, "operations_data", JSON.stringify(ops));
				},
			},
			parent: tr.find(".mould-col"),
			only_input: true,
		});
		mould_ctrl.make_input();
		mould_ctrl.set_value(op.mould);
	});
}
