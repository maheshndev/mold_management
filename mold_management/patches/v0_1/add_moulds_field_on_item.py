import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    fields = [
        {
            "fieldname": "shape",
            "label": "Shape",
            "fieldtype": "Link",
            "options": "Shape",
            "insert_after": "mould_ty"
        },
        {
            "fieldname": "mould_ty",
            "label": "Mould Type",
            "fieldtype": "Link",
            "options": "Mould Type",
            "insert_after": "mould_name"
        },
        {
            "fieldname": "material_type",
            "label": "Material Type",
            "fieldtype": "Link",
            "options": "Material Type",
            "insert_after": "shape"
        },
        {
            "fieldname": "no_of_cavity",
            "label": "No of Cavity",
            "fieldtype": "Data",
            "insert_after": "material_type"
        },
        {
            "fieldname": "side_cores",
            "label": "Side Cores",
            "fieldtype": "Select",
            "options": "\nYes\nNo",
            "insert_after": "no_of_cavity"
        },
        {
            "fieldname": "side_cores_qty",
            "label": "Side Cores Qty (in Nos.)",
            "fieldtype": "Data",
            "insert_after": "side_cores"
        },
        {
            "fieldname": "hot_runner_system",
            "label": "Hot Runner System",
            "fieldtype": "Select",
            "options": "\nYes\nNo",
            "insert_after": "side_cores_qty"
        },
        {
            "fieldname": "cold_runner_system",
            "label": "Cold Runner System",
            "fieldtype": "Select",
            "options": "\nYes\nNo",
            "insert_after": "hot_runner_system"
        },
        {
            "fieldname": "tool_life",
            "label": "Tool Life (Year)",
            "fieldtype": "Data",
            "insert_after": "cold_runner_system"
        },
        {
            "fieldname": "total_shots",
            "label": "Maintenance Required Per Shot",
            "fieldtype": "Data",
            "insert_after": "tool_life"
        },
        {
            "fieldname": "total_lifecycle_shot",
            "label": "Total Lifecycle Shot",
            "fieldtype": "Data",
            "insert_after": "total_shots"
        }
       
    ]

    for df in fields:
        create_custom_field("Item", df)
