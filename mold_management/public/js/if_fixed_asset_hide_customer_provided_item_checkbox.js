frappe.ui.form.on("Item", {
    refresh(frm) {
        toggle_customer_provided(frm);
    },
    is_fixed_asset(frm) {
        toggle_customer_provided(frm);
    }
});

function toggle_customer_provided(frm) {
    if (frm.doc.is_fixed_asset) {
        // Hide field
        frm.toggle_display("is_customer_provided_item", false);

        // Optional: Uncheck it if checked
        frm.set_value("is_customer_provided_item", 0);
    } else {
        // Show field again
        frm.toggle_display("is_customer_provided_item", true);
    }
}
