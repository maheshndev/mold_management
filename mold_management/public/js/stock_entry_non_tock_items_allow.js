frappe.ui.form.on("Stock Entry", {
    onload: function(frm) {
        remove_item_filter(frm);
    },
 
    refresh: function(frm) {
        remove_item_filter(frm);
    }
});
 
function remove_item_filter(frm) {
    frm.fields_dict.items.grid.get_field("item_code").get_query = function() {
        return {
            filters: {}   // ✅ NO FILTER APPLIED
        };
    };
}