import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "BOM": [
            {
                "fieldname": "is_moulding_item",
                "label": "Is Moulding Item",
                "fieldtype": "Check",
                "insert_after": "is_phantom_bom",
                "fetch_from": "item.is_moulding"
            }
        ],
        "Production Plan Sub Assembly Item": [
            {
                "fieldname": "workstation",
                "label": "Workstation",
                "fieldtype": "Link",
                "options": "Workstation",
                "insert_after": "bom_no",
                "eval": "doc.bom_no.is_moulding_item"
            },
            {
                "fieldname": "mould",
                "label": "Mould",
                "fieldtype": "Link",
                "options": "Mould",
                "insert_after": "workstation",
                "eval": "doc.bom_no.is_moulding_item"
            }
        ]
    }

    create_custom_fields(custom_fields)
    frappe.clear_cache()
