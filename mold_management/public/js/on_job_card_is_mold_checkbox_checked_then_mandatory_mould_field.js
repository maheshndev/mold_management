frappe.ui.form.on('Job Card', {
    is_mould: function(frm) {
        // If checkbox is checked, make mould field mandatory
        if (frm.doc.is_mould) {
            frm.set_df_property('mould', 'reqd', 1);
        } 
        // If unchecked, remove mandatory
        else {
            frm.set_df_property('mould', 'reqd', 0);
        }
    }
});
