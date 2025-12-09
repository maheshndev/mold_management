frappe.ui.form.on('Mould Maintenance', {
    maintenance_team(frm) {
        toggle_supplier_mandatory(frm);
    },

    refresh(frm) {
        toggle_supplier_mandatory(frm);
    }
});

function toggle_supplier_mandatory(frm) {
    const is_supplier = frm.doc.maintenance_team === "Out-source";

    // Set mandatory property in child table field
    frm.fields_dict['mould_maintenance_tasks']
        .grid.update_docfield_property(
            "assign_to_supplier",
            "reqd",
            is_supplier ? 1 : 0
        );

    // Also visually refresh grid
    frm.refresh_field("mould_maintenance_tasks");
}

