frappe.ui.form.on('Mould Maintenance', {
    validate: function(frm) {
        if (frm.doc.required_parts) {
            frm.doc.required_parts.forEach(function(row) {
                row.amount = (row.rate || 0) * (row.quantity || 0);
            });
            frm.refresh_field('required_parts');
        }
    }
});
