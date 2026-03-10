import frappe

def execute():
    from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
    
    # We are updating the 'insert_after' property of our existing custom fields
    # to move them after 'stock_reserved_qty' for sub_assembly_items.
    # For po_items, we'll leave it after 'bom_no' as requested or move it specifically if needed.
    # We'll re-run create_custom_fields which acts as an upsert/update for existing names.
    
    update_fields = {
        "Production Plan Sub Assembly Item": [
            {
                "fieldname": "operations_html",
                "label": "Operations",
                "fieldtype": "HTML",
                "insert_after": "stock_reserved_qty"
            },
            {
                "fieldname": "operations_data",
                "label": "Operations Data",
                "fieldtype": "Text",
                "hidden": 1,
                "insert_after": "operations_html"
            }
        ]
    }
    create_custom_fields(update_fields)
    frappe.clear_cache()
