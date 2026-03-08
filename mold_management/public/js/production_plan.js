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

function fetch_bom_operations(frm, cdt, cdn) {
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
				render_operations_html(frm, cdt, cdn);
			}
		},
	});
}

function render_operations_html(frm, cdt, cdn) {
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
	} catch (e) {}

	let wrapper = $(html_field.wrapper).empty();

	if (ops.length === 0) {
		wrapper.html('<p class="text-muted">No operations found for this Item/BOM.</p>');
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

	// Mount actual frappe link fields inside the TDs for awesomplete!
	ops.forEach((op, idx) => {
		let tr = wrapper.find(`tr[data-idx="${idx}"]`);
		let ws_td = tr.find(".ws-col");
		let mould_td = tr.find(".mould-col");

		let ws_control = frappe.ui.form.make_control({
			df: {
				fieldtype: "Link",
				options: "Workstation",
				fieldname: "workstation_" + idx,
				label: "Workstation",
				onchange: function () {
					ops[idx].workstation = this.get_value();
					frappe.model.set_value(cdt, cdn, "operations_data", JSON.stringify(ops));
				},
			},
			parent: ws_td,
			only_input: true,
		});
		ws_control.make_input();
		ws_control.set_value(op.workstation);

		let mould_control = frappe.ui.form.make_control({
			df: {
				fieldtype: "Link",
				options: "Mould",
				fieldname: "mould_" + idx,
				label: "Mould",
				onchange: function () {
					ops[idx].mould = this.get_value();
					frappe.model.set_value(cdt, cdn, "operations_data", JSON.stringify(ops));
				},
			},
			parent: mould_td,
			only_input: true,
		});
		mould_control.make_input();
		mould_control.set_value(op.mould);
	});
}
