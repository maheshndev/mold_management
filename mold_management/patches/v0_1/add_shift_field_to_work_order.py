import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    field_shift = {
        "fieldname": "shift",
        "label": "Shift",
        "fieldtype": "Link",
        "options": "Shift Type",
        "insert_after": "process_loss_qty"
    }

    try:
        create_custom_field("Work Order", field_shift)
        frappe.clear_cache()
    except Exception as e:
        # Ignore if field already exists during manual execution or re-run
        if "Duplicate column name" not in str(e):
            frappe.log_error(f"Error adding shift field to Work Order: {str(e)}", "add_shift_field_to_work_order")
