frappe.ui.form.on("Daily Production Log", {
	refresh(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__("View Report"), () => {
				frappe.set_route("daily-production-rep", frm.doc.name);
			});
		}
	},
	first_counter: function (frm) {
		calculate_parent_totals(frm);
	},
	shot_weight: function (frm) {
		calculate_parent_totals(frm);
	},
	runner_weight: function (frm) {
		calculate_parent_totals(frm);
	},
});

frappe.ui.form.on("Production Shots Table", {
	ok_shots: function (frm, cdt, cdn) {
		calculate_row_total(frm, cdt, cdn);
		calculate_parent_totals(frm);
	},
	rej_shots: function (frm, cdt, cdn) {
		calculate_row_total(frm, cdt, cdn);
		calculate_parent_totals(frm);
	},
	production_data_remove: function (frm) {
		calculate_parent_totals(frm);
	},
});

function calculate_row_total(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	frappe.model.set_value(cdt, cdn, "total_shots", flt(row.ok_shots) + flt(row.rej_shots));
}

function calculate_parent_totals(frm) {
	let total_ok = 0;
	let total_rej = 0;

	(frm.doc.production_data || []).forEach((row) => {
		total_ok += flt(row.ok_shots);
		total_rej += flt(row.rej_shots);
	});

	frm.set_value("total_ok_shots", total_ok);
	frm.set_value("total_rej_shots", total_rej);
	frm.set_value("total_shots", total_ok + total_rej);

	// Update last_counter
	frm.set_value("last_counter", flt(frm.doc.first_counter) + total_ok + total_rej);

	// RM Consumption calculation (grams to kg)
	if (frm.doc.shot_weight || frm.doc.runner_weight) {
		let s_wt = flt(frm.doc.shot_weight);
		let r_wt = flt(frm.doc.runner_weight);
		frm.set_value("rm_consumption", ((s_wt + r_wt) * (total_ok + total_rej)) / 1000);
	}
}
