import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    # 1. Create the Custom Child DocType if it doesn't exist
    if not frappe.db.exists("DocType", "Production Plan Item Operation"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Production Plan Item Operation",
            "module": "Mold Management",
            "custom": 1,
            "istable": 1,
            "editable_grid": 1,
            "fields": [
                {"fieldname": "operation", "fieldtype": "Link", "options": "Operation", "label": "Operation", "in_list_view": 1},
                {"fieldname": "workstation", "fieldtype": "Link", "options": "Workstation", "label": "Workstation", "in_list_view": 1},
                {"fieldname": "mould", "fieldtype": "Link", "options": "Mould", "label": "Mould", "in_list_view": 1}
            ]
        })
        doc.insert(ignore_permissions=True)

    # 2. Add as custom field to Production Plan Item and Sub Assembly Item
    custom_fields = {
        "Production Plan Item": [
            {
                "fieldname": "operations",
                "label": "Operations",
                "fieldtype": "Table",
                "options": "Production Plan Item Operation",
                "insert_after": "bom_no"
            }
        ],
        "Production Plan Sub Assembly Item": [
            {
                "fieldname": "operations",
                "label": "Operations",
                "fieldtype": "Table",
                "options": "Production Plan Item Operation",
                "insert_after": "bom_no"
            }
        ]
    }
    create_custom_fields(custom_fields)
    frappe.clear_cache()
