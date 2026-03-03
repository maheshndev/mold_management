import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # Fields for Item Quality Inspection Parameter (Child table of Quality Inspection Template)
    fields = [
        {
            "fieldname": "sampling_plan",
            "label": "Sample Type",
            "fieldtype": "Link",
            "options": "Sampling Plan",
            "insert_after": "specification"
        },
        {
            "fieldname": "sampling_qty",
            "label": "Sample Qty",
            "fieldtype": "Float",
            "insert_after": "sampling_plan"
        },
        {
            "fieldname": "criteria_type",
            "label": "Criteria Type",
            "fieldtype": "Select",
            "options": "Equals\nAverage\nMin-Max\nMax\nMin\nNot Equal",
            "insert_after": "sampling_qty"
        },
        {
            "fieldname": "avg",
            "label" : "Average",
            "fieldtype": "Data",
            "insert_after": "criteria_type"
        }

    ]

    try:
        for field in fields:
            create_custom_field("Quality Inspection Reading", field)
        frappe.clear_cache()
    except Exception as e:
        if "Duplicate column name" not in str(e):
            frappe.log_error(f"Error adding sampling fields to Item Quality Inspection Parameter: {str(e)}", "add_sampling_fields_to_qi_template")
