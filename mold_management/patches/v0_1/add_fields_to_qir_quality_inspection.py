import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # Fields for Item Quality Inspection Parameter (Child table of Quality Inspection Template)
    fields = [
        {
            "fieldname": "sample_type",
            "label": "Sample Type",
            "fieldtype": "Link",
            "options": "Sample Type",
            "insert_after": "specification",
            "in_list_view": 1,
            "columns": 2,
            "fetch_from": "quality_inspection_template.sample_type"

        },
        {
            "fieldname": "sample_qty",
            "label": "Sample Qty",
            "fieldtype": "Float",
            "insert_after": "sample_type",
            "in_list_view": 1,
            "columns": 1,
            "fetch_from": "quality_inspection_template.sample_qty"
        },
        {
            "fieldname": "criteria_type",
            "label": "Criteria Type",
            "fieldtype": "Select",
            "options": "Equals\nAverage\nMin-Max\nMax\nMin\nNot Equal",
            "insert_after": "sample_qty",
            "fetch_from": "quality_inspection_template.criteria_type"
        },
        {
            "fieldname": "avg",
            "label" : "Average",
            "fieldtype": "Data",
            "insert_after": "criteria_type",
            "fetch_from": "quality_inspection_template.avg"
        }

    ]

    try:
        for field in fields:
            create_custom_field("Quality Inspection Reading", field)
        frappe.clear_cache()
    except Exception as e:
        if "Duplicate column name" not in str(e):
            frappe.log_error(f"Error adding sampling fields to Item Quality Inspection Parameter: {str(e)}", "add_sampling_fields_to_qi_template")
