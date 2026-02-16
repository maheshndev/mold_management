// frappe.ui.form.on('Job Card', {
//     production_item(frm) {

//         if (!frm.doc.production_item) {
//             frm.mould_no_options = [];
//             frm.refresh_field('mould');
//             return;
//         }

//         // Fetch Item
//         frappe.db.get_doc('Item', frm.doc.production_item).then(item_doc => {

//             // ✅ Read mould_no from child doctype "Mould Selection"
//             const mould_nos = (item_doc.mould_selection_table || [])
//                 .filter(row => row.mould_no)
//                 .map(row => row.mould_no);

//             console.log("FINAL MOULD LIST:", mould_nos); // Debug

//             frm.mould_no_options = mould_nos;

//             // ✅ Apply filter to Job Card → mould field
//             frm.fields_dict.mould.get_query = function () {
//                 return {
//                     filters: {
//                         name: ["in", frm.mould_no_options || []]
//                     }
//                 };
//             };

//             frm.refresh_field('mould');
//         });
//     },

//     refresh(frm) {
//         frm.fields_dict.mould.get_query = function () {
//             return {
//                 filters: {
//                     name: ["in", frm.mould_no_options || []]
//                 }
//             };
//         };
//     }
// });

frappe.ui.form.on("Job Card", {
	refresh(frm) {
		apply_mould_filter(frm);
	},

	production_item(frm) {
		apply_mould_filter(frm);
	},

	work_order(frm) {
		if (frm.doc.work_order) {
			frappe.db.get_value("Work Order", frm.doc.work_order, "mould", (r) => {
				if (r && r.mould && !frm.doc.mould) {
					frm.set_value("mould", r.mould);
				}
			});
		}
	},
});

function apply_mould_filter(frm) {
	if (!frm.doc.production_item) {
		frm.mould_no_options = [];
		frm.refresh_field("mould");
		return;
	}

	frappe.db.get_doc("Item", frm.doc.production_item).then((item_doc) => {
		const mould_nos = (item_doc.mould_selection_table || [])
			.filter((row) => row.mould_no)
			.map((row) => row.mould_no);

		frm.mould_no_options = mould_nos;

		// Apply filter to mould field
		frm.fields_dict.mould.get_query = function () {
			return {
				filters: {
					name: ["in", frm.mould_no_options || []],
				},
			};
		};

		frm.refresh_field("mould");
	});
}
