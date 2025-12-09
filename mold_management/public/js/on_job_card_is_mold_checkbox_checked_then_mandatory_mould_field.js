// frappe.ui.form.on('Job Card', {
//     refresh(frm) {
//         toggle_mould_field(frm);
//     },

//     is_mould(frm) {
//         toggle_mould_field(frm);
//     }
// });

// function toggle_mould_field(frm) {
//     if (frm.doc.is_mould) {
//         // Show field & make mandatory
//         frm.set_df_property('mould', 'hidden', 1);
//         frm.set_df_property('mould', 'reqd', 0);
//     } else {
//         // Hide field & remove mandatory
//         frm.set_df_property('mould', 'hidden', 0);
//         frm.set_df_property('mould', 'reqd', 1);

//         // Optional: Clear value when hidden
//         frm.set_value('mould', null);
//     }
    
// }
