import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    field = {
        "fieldname": "custom_feasibility_items",
        "label": "Feasibility Items",
        "fieldtype": "Small Text",
        "hidden": 1,
        "insert_after": "design_document_attachment"  # You can change position as needed
    }

    create_custom_field("Lead", field)
