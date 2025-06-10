

frappe.ui.form.on("Mold Parameter", {
    onload: function(frm) {
        frm.fields_dict.parameters.grid.get_field("parameter").get_query = function(doc, cdt, cdn) {
            const row = locals[cdt][cdn];
            if (!row.mold_no) {
                return { filters: [] };
            }

            return {
                query: "mold_management.mold_management.doctype.mold_parameter.mold_parameter.get_parameters_for_mold",
                filters: {
                    mold_no: row.mold_no
                }
            };
        };
    }
});


frappe.ui.form.on("Molds Parameter", {
    parameter: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        if (!row.parameter) return;

        frappe.call({
            method: "mold_management.mold_management.doctype.mold_parameter.mold_parameter.get_parameter_details",
            args: {
                parameter: row.parameter
            },
            callback: function(r) {
                if (r.message) {
                    // Set value field in the same child row
                    //frappe.model.set_value(cdt, cdn, "value", r.message.value);

                    // You can set more fields if needed
                    // frappe.model.set_value(cdt, cdn, "description", r.message.description);
                }
            }
        });
    }

    
});


frappe.ui.form.on("Molds Parameter", {
    parameter: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        if (!row.parameter) return;

        frappe.call({
            method: "mold_management.mold_management.doctype.mold_parameter.mold_parameter.get_parameter_details",
            args: {
                parameter: row.parameter,
                mold_no:row.mold_no
            },
            callback: function(r) {
                console.log(r)
                if (r.message) {
                   
                 //   frappe.model.set_value(cdt, cdn, "value", r.message.value);

                   
                }
            }
        });
    }
});
