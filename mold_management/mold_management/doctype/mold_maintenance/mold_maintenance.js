// Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on("Mold Maintenance", {
	setup: (frm) => {
		frm.set_query("mold_name", function () {
			return {
				filters: {
					company: frm.doc.company,
				},
			};
		});

		// frm.set_query("assign_to", "mold_maintenance_tasks", function (doc) {
		// 	return {
		// 		query: "mold_management.mold_management.doctype.mold_maintenance.mold_maintenance.get_team_members",
		// 		// filters: {
		// 		// 	maintenance_team: doc.maintenance_team,
		// 		// },
		// 	};
		// });
		

		frm.set_indicator_formatter("maintenance_status", function (doc) {
			let indicator = "blue";
			if (doc.maintenance_status == "Overdue") {
				indicator = "orange";
			}
			if (doc.maintenance_status == "Cancelled") {
				indicator = "red";
			}
			return indicator;
		});
	},

	refresh: (frm) => {
		if (!frm.is_new()) {
			frm.trigger("make_dashboard");
		}
	},
	make_dashboard: (frm) => {
		if (!frm.is_new()) {
			frappe.call({
				method: "mold_management.mold_management.doctype.mold_maintenance.mold_maintenance.get_maintenance_log",
				args: { mold_name: frm.doc.mold_name },
				callback: (r) => {
					if (!r.message) {
						return;
					}
					const section = frm.dashboard.add_section("", __("Maintenance Log"));
					var rows = $("<div></div>").appendTo(section);
					// show
					(r.message || []).forEach(function (d) {
						$(`<div class='row' style='margin-bottom: 10px;'>
							<div class='col-sm-3 small'>
								<a onclick="frappe.set_route('List', 'Mold Maintenance Order',
									{'mold_name': '${d.mold_name}','maintenance_status': '${d.maintenance_status}' });">
									${__(d.maintenance_status)} <span class="badge">${d.count}</span>
								</a>
							</div>
						</div>`).appendTo(rows);
					});
					frm.dashboard.show();
				},
			});
		}
	},
});

frappe.ui.form.on("Mold Maintenance Task", {
	start_date: (frm, cdt, cdn) => {
		get_next_due_date(frm, cdt, cdn);
	},
	periodicity: (frm, cdt, cdn) => {
		get_next_due_date(frm, cdt, cdn);
	},
	last_completion_date: (frm, cdt, cdn) => {
		get_next_due_date(frm, cdt, cdn);
	},
	end_date: (frm, cdt, cdn) => {
		get_next_due_date(frm, cdt, cdn);
	},
});

var get_next_due_date = function (frm, cdt, cdn) {
	var d = locals[cdt][cdn];
	if (d.start_date && d.periodicity) {
		return frappe.call({
			method: "mold_management.mold_management.doctype.mold_maintenance.mold_maintenance.calculate_next_due_date",
			args: {
				start_date: d.start_date,
				periodicity: d.periodicity,
				end_date: d.end_date,
				last_completion_date: d.last_completion_date,
				next_due_date: d.next_due_date,
			},
			callback: function (r) {
				if (r.message) {
					frappe.model.set_value(cdt, cdn, "next_due_date", r.message);
				} else {
					frappe.model.set_value(cdt, cdn, "next_due_date", "");
				}
			},
		});
	}
};
