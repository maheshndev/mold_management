frappe.ui.form.on('Stock Entry', {
 
    onload(frm) { auto_fetch_items(frm); },
 
    refresh(frm) { auto_fetch_items(frm); },
 
    work_order(frm) { auto_fetch_items(frm); },
 
    purpose(frm) { auto_fetch_items(frm); },
 
});

async function auto_fetch_items(frm) {
 
    try {
 
        if (!frm.doc.work_order || !frm.doc.purpose) return;

        const wo = await frappe.db.get_doc('Work Order', frm.doc.work_order);
 
        if (!wo) return;

        // Only auto-fill if items are empty or incorrect
 
        let should_replace = !frm.doc.items || frm.doc.items.length === 0;

        if (!should_replace && frm.doc.items.length === 1) {
 
            if (frm.doc.items[0].item_code === wo.production_item) {
 
                should_replace = true;
 
            }
 
        }

        if (!should_replace) return;

        frm.clear_table("items");

        // -------------------------------------------------------
 
        // CASE 1: MATERIAL TRANSFER FOR MANUFACTURE → RAW ONLY
 
        // -------------------------------------------------------
 
        if (frm.doc.purpose === "Material Transfer for Manufacture") {
 
            for (let r of wo.required_items) {
 
                let row = frm.add_child("items");
 
                row.item_code = r.item_code;
 
                row.qty = r.required_qty || r.qty || 0;
 
                row.conversion_factor = 1;
 
                row.s_warehouse = wo.source_warehouse;
 
                row.t_warehouse = wo.wip_warehouse;
 
            }

            frm.refresh_field("items");
 
            return;
 
        }

        // -------------------------------------------------------
 
        // CASE 2: MANUFACTURE → FG + RAW MATERIALS
 
        // -------------------------------------------------------
 
        // if (frm.doc.purpose === "Manufacture") {

        //     // ✅ Required for Manufacture
 
        //     frm.set_value("fg_completed_qty", wo.qty);

        //     // ✅ FINISHED GOOD (VERY IMPORTANT)
 
        //     let fg = frm.add_child("items");
 
        //     fg.item_code = wo.production_item;
 
        //     fg.qty = wo.qty;
 
        //     fg.conversion_factor = 1;
 
        //     //fg.t_warehouse = wo.fg_warehouse;
 
        //     fg.is_finished_item = 1;   // 🔥 CRITICAL FIX
 
        //     fg.s_warehouse = "";       // 🔥 MUST BE EMPTY

        //     // RAW MATERIALS
 
        //     for (let r of wo.required_items) {
 
        //         let row = frm.add_child("items");
 
        //         row.item_code = r.item_code;
 
        //         row.qty = r.required_qty || r.qty || 0;
 
        //         row.conversion_factor = 1;
 
        //         row.s_warehouse = wo.wip_warehouse;
 
        //         row.is_finished_item = 0;
 
        //     }

        //     frm.refresh_field("items");
 
        // }
 
        if (frm.doc.purpose === "Manufacture") {

            // Clear existing items (important to avoid duplicates)
 
            frm.clear_table("items");
 
            // ✅ Required for Manufacture
 
            frm.set_value("fg_completed_qty", wo.qty);
 
            /* -----------------------------
 
               1️⃣ RAW MATERIALS FIRST
 
            ----------------------------- */
 
            (wo.required_items || []).forEach(r => {
 
                let row = frm.add_child("items");
 
                row.item_code = r.item_code;
 
                row.qty = r.required_qty || r.qty || 0;
 
                row.conversion_factor = 1;
 
                row.s_warehouse = wo.wip_warehouse;
 
                row.t_warehouse = "";        // must be empty
 
                row.is_finished_item = 0;
 
            });
 
            /* -----------------------------
 
               2️⃣ FINISHED GOOD LAST
 
            ----------------------------- */
 
            let fg = frm.add_child("items");
 
            fg.item_code = wo.production_item;
 
            fg.qty = wo.qty;
 
            fg.conversion_factor = 1;
 
            fg.t_warehouse = wo.fg_warehouse;   // FG goes TO warehouse
 
            fg.s_warehouse = "";                // MUST be empty
 
            fg.is_finished_item = 1;             // 🔥 CRITICAL
 
            frm.refresh_field("items");
 
        }


    } catch (e) {
 
        console.error(e);
 
        frappe.msgprint({
 
            title: "Auto Fetch Error",
 
            message: e.message,
 
            indicator: "red"
 
        });
 
    }
 
}


 