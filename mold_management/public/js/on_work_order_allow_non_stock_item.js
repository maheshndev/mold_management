frappe.ui.form.on("Work Order", {
 
    onload: function(frm) {
 
        remove_item_filter(frm);
 
    },
 
    refresh: function(frm) {
 
        remove_item_filter(frm);
 
    }
 
});

function remove_item_filter(frm) {
 
    frm.set_query("production_item", function() {
 
        return {};   // ✅ Removes all default filters
 
    });
 
}
 
 