import frappe

def execute():
    # Remove the invalid 'Table' custom fields we created earlier
    custom_fields = [
        "Production Plan Item-operations",
        "Production Plan Sub Assembly Item-operations"
    ]
    
    for field_name in custom_fields:
        if frappe.db.exists("Custom Field", field_name):
            frappe.delete_doc("Custom Field", field_name, ignore_missing=True)
            
    # Add an HTML field and a Hidden Text field instead
    from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
    new_fields = {
        "Production Plan Item": [
            {
                "fieldname": "operations_html",
                "label": "Operations",
                "fieldtype": "HTML",
                "insert_after": "bom_no"
            },
            {
                "fieldname": "operations_data",
                "label": "Operations Data",
                "fieldtype": "Text",
                "hidden": 1,
                "insert_after": "operations_html"
            }
        ],
        "Production Plan Sub Assembly Item": [
            {
                "fieldname": "operations_html",
                "label": "Operations",
                "fieldtype": "HTML",
                "insert_after": "bom_no"
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
    create_custom_fields(new_fields)
    frappe.clear_cache()
