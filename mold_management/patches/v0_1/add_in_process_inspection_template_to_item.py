import frappe

def execute():
    # Check if field already exists using filters for more reliability
    field = frappe.db.exists("Custom Field", {"dt": "Item", "fieldname": "in_process_inspection_template"})
    
    field_data = {
        "doctype": "Custom Field",
        "dt": "Item",
        "fieldname": "in_process_inspection_template",
        "label": "In Process Inspection Template",
        "fieldtype": "Link",
        "options": "Quality Inspection Template",
        "insert_after": "inspection_required_before_delivery"
    }

    if not field:
        frappe.get_doc(field_data).insert()
    else:
        # Update existing field if found
        doc = frappe.get_doc("Custom Field", field)
        doc.update(field_data)
        doc.save()
