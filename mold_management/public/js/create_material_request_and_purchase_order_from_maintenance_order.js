frappe.ui.form.on('Mould Maintenance Order', {

    refresh: function (frm) {

        // Add 'Create' button with dropdown options

        frm.add_custom_button('Material Request', () => {

            create_material_request(frm);

        }, 'Create');
 
        frm.add_custom_button('Purchase Order', () => {

            create_purchase_order(frm);

        }, 'Create');

    }

});
 
function create_material_request(frm) {

    // Create Material Request document

    frappe.call({

        method: "frappe.client.insert",

        args: {

            doc: {

                doctype: "Material Request",

                material_request_type: "Purchase",

                schedule_date: frappe.datetime.nowdate(),

                company: frm.doc.company || "",
                custom_mold_maintenance_id: frm.doc.name,

                items: frm.doc.parts.map(row => {

                    return {

                        item_code: row.item,

                        uom: row.uom,

                        qty: row.quantity,

                        rate: row.rate,

                        amount: row.amount

                    };

                })

            }

        },

        callback: function (r) {

            if (!r.exc) {

                frappe.msgprint(`Material Request <a href="/app/material-request/${r.message.name}"><b>${r.message.name}</b></a> created.`);

                frappe.set_route("form", "Material Request", r.message.name);

            }

        }

    });

}
 
function create_purchase_order(frm) {

    // Create Purchase Order document

    frappe.call({

        method: "frappe.client.insert",

        args: {

            doc: {

                doctype: "Purchase Order",

                schedule_date: frappe.datetime.nowdate(),

                company: frm.doc.company || "",

                supplier: frm.doc.supplier || "",
                custom_mold_maintenance_id: frm.doc.name,// ✅ Fetching supplier from Mold Maintenance Order

                items: frm.doc.parts.map(row => {

                    return {

                        item_code: row.item,

                        uom: row.uom,

                        qty: row.quantity,

                        rate: row.rate,

                        amount: row.amount

                    };

                })

            }

        },

        callback: function (r) {

            if (!r.exc) {

                frappe.msgprint(`Purchase Order <a href="/app/purchase-order/${r.message.name}"><b>${r.message.name}</b></a> created.`);

                frappe.set_route("form", "Purchase Order", r.message.name);

            }

        }

    });

}

 