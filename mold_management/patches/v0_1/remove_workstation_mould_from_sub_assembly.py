import frappe

def execute():
    custom_fields = [
        "Production Plan Sub Assembly Item-workstation",
        "Production Plan Sub Assembly Item-mould"
    ]
    
    for field_name in custom_fields:
        if frappe.db.exists("Custom Field", field_name):
            frappe.delete_doc("Custom Field", field_name, ignore_missing=True)
            
    frappe.clear_cache(doctype="Production Plan Sub Assembly Item")
