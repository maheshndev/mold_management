// frappe.ui.form.on('Mould', {
//    refresh: function(frm) {
//        frm.add_custom_button(__('Mould Maintenance'), function() {
//         frappe.new_doc('Mould Maintenance', {
//                 mould_name: frm.doc.name   // optional: link current mould
//             });
//            frappe.msgprint(frm.doc.email);
//        }, __("Manage"));

//        frm.add_custom_button(__('Mould Movement'), function() {
//         frappe.new_doc('Mould Movement', {
               
//             });
//            frappe.msgprint(frm.doc.email);
//        }, __("Manage"));
//    }
// });
 

// frappe.ui.form.on('Mould', {
//     refresh: function(frm) {

//         // Mould Maintenance
//         frm.add_custom_button(__('Mould Maintenance'), function () {
//             frappe.new_doc('Mould Maintenance', {
//                 mould_name: frm.doc.name
//             });
//         }, __("Manage"));

//         // Mould Movement
//         frm.add_custom_button(__('Mould Movement'), function () {

//             frappe.new_doc('Mould Movement', {}, function (doc) {

//                 // Add row to Assets child table
//                 let row = frappe.model.add_child(
//                     doc,
//                     'assets',          // Child table fieldname
//                     'assets'           // Child doctype name
//                 );

//                 // Set mould ID into asset field
//                 row.asset = frm.doc.name;

//                 // Refresh child table
//                 cur_frm.refresh_field('assets');
//             });

//         }, __("Manage"));
//     }
// });

frappe.ui.form.on('Mould', {
    refresh: function (frm) {

        // Mould Maintenance
        frm.add_custom_button(__('Mould Maintenance'), function () {
            frappe.new_doc('Mould Maintenance', {
                mould_name: frm.doc.name
            });
        }, __("Manage"));

        // Mould Movement
        frm.add_custom_button(__('Mould Movement'), function () {

            frappe.new_doc('Mould Movement', {}, function (doc) {

                let row;

                // ✅ Use existing empty row if present
                if (doc.assets && doc.assets.length > 0) {
                    row = doc.assets[0];
                } else {
                    row = frappe.model.add_child(doc, 'assets', 'assets');
                }

                // Set mould ID
                row.asset = frm.doc.name;

                // Refresh child table
                cur_frm.refresh_field('assets');
            });

        }, __("Manage"));
    }
});
