frappe.ui.form.on('Mould', {
    after_save: function(frm) {
        // If mould_code is empty, set the docname here
        if (!frm.doc.mould_code) {
            frm.set_value('mould_code', frm.doc.name);

            // Save again after setting value
            frm.save();
        }
    }
});
