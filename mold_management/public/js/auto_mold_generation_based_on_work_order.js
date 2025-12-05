
frappe.ui.form.on('Work Order', {
    refresh(frm) {
        safe_check_and_create(frm);
    },

    status(frm) {
        safe_check_and_create(frm);
    }
});

// in-memory lock to avoid duplicate runs
if (!window.__creating_moulds_lock) window.__creating_moulds_lock = {};

function safe_check_and_create(frm) {
    try {
        if (!frm || !frm.doc) return;

        // Check if field exists
        if (!frm.fields_dict || !frm.fields_dict.mould_created) {
            frappe.show_alert({
                message: __('Field "mould_created" not found on Work Order. Check Customize Form.'),
                indicator: 'orange'
            });
            console.warn('mould_created field missing on Work Order.');
            return;
        }

        // Only run when Completed & not already created
        if (frm.doc.status === 'Completed' && frm.doc.mould_created !== 1) {

            // Avoid concurrent execution
            if (window.__creating_moulds_lock[frm.docname]) return;
            window.__creating_moulds_lock[frm.docname] = true;

            create_mould_records_async(frm).finally(() => {
                window.__creating_moulds_lock[frm.docname] = false;
            });
        }

    } catch (err) {
        console.error('safe_check_and_create error', err);
    }
}

async function create_mould_records_async(frm) {
    try {
        // Count total moulds required
        let total_to_create = 0;
        (frm.doc.required_items || []).forEach(item => {
            if (item.is_mould_item && item.required_qty > 0) {
                total_to_create += item.required_qty;
            }
        });

        if (total_to_create === 0) {
            console.log('Nothing to create.');
            return;
        }

        // Mark flag first
        await frm.set_value("mould_created", 1);
        await frm.save();

        let created = 0;
        let errors = [];

        for (const item of (frm.doc.required_items || [])) {
            if (!(item.is_mould_item && item.required_qty > 0)) continue;

            for (let i = 0; i < item.required_qty; i++) {

                const mould_doc = {
                    doctype: "Mould",
                    mould_name: item.mould_name || `Mould-${frm.docname}-${i+1}`,
                    shape: item.shape || "",
                    work_order: frm.doc.name
                };

                try {
                    await frappe.db.insert(mould_doc);
                    created++;
                } catch (e) {
                    console.error("Insert failed:", e);
                    errors.push({ item, error: e });
                }
            }
        }

        // -------------------------------
        // SUCCESS CASE
        // -------------------------------
        if (errors.length === 0) {
            frappe.show_alert({
                message: __("Mould records created: {0}", [created]),
                indicator: "green"
            });

            console.log(`All moulds created (${created}/${total_to_create})`);

            // ⭐ IMPORTANT: Final auto-save to remove "Not Saved"
            await frm.save();

            return;
        }

        // -------------------------------
        // PARTIAL FAILURE
        // -------------------------------
        await frm.set_value("mould_created", 0);
        await frm.save();

        frappe.msgprint({
            title: __("Partial Failure"),
            message: __(
                "Created {0}/{1}. Some moulds failed. 'mould_created' reset to 0.",
                [created, total_to_create]
            ),
            indicator: "red"
        });

    } catch (err) {
        console.error("Unexpected error:", err);

        try {
            await frm.set_value("mould_created", 0);
            await frm.save();
        } catch (e) {
            console.error("Rollback failed:", e);
        }

        frappe.msgprint({
            title: __("Error"),
            message: __("Mould creation failed. Check console."),
            indicator: "red"
        });
    }
}
