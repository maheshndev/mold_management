
frappe.ui.form.on("Work Order", {
    work_order_routing: function (frm) {

        if (!frm.doc.work_order_routing) {
            frm.clear_table("operations");
            frm.refresh_field("operations");
            return;
        }

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Work Order Routing",
                name: frm.doc.work_order_routing
            },
            callback: function (r) {
                if (!r.message) return;

                // Clear existing operations
                frm.clear_table("operations");

                // Fetch operations from Work Order Routing
                (r.message.operations || []).forEach(src_row => {
                    let row = frm.add_child("operations");

                    // Common fields
                    row.operation  = src_row.operation;
                    row.item_code  = src_row.item_code;

                    // Optional mappings (use only if fields exist)
                    row.workstation = src_row.workstation;
                    row.description = src_row.description;
                    row.time_in_mins = src_row.time_in_mins;
                    row.workstation_type = src_row.workstation_type;
                    row.sequence_id = src_row.sequence_id;
                    row.hour_rate = src_row.hour_rate;
                });

                frm.refresh_field("operations");
            }
        });
    }
});
