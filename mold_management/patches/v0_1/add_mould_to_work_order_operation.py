import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # Add 'mould' field to Work Order Operation
    if not frappe.db.exists("Custom Field", "Work Order Operation-mould"):
        field = {
            "fieldname": "mould",
            "label": "Mould",
            "fieldtype": "Link",
            "options": "Mould",
            "insert_after": "workstation"
        }
        create_custom_field("Work Order Operation", field)
        frappe.clear_cache(doctype="Work Order Operation")
