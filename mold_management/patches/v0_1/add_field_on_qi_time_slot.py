import frappe

def execute():
    # Check if field already exists using filters for more reliability
    field = frappe.db.exists("Custom Field", {"dt": "Quality Inspection", "fieldname": "time_slot"})
    
    field_data = {
        "doctype": "Custom Field",
        "dt": "Quality Inspection",
        "fieldname": "time_slot",
        "label": "Time Slot",
        "fieldtype": "Link",
        "options": "Production Time Slots",
        "insert_after": "item_name",
        "depends_on": "eval:doc.inspection_type == 'In Process'"
    }

    if not field:
        frappe.get_doc(field_data).insert()
    else:
        # Update existing field to ensure depends_on is applied
        doc = frappe.get_doc("Custom Field", field)
        doc.update(field_data)
        doc.save()
