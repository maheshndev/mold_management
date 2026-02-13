import frappe

@frappe.whitelist()
def get_production_log_details(name=None):
    if not name:
        # If no name is provided, fetch the most recent log
        name = frappe.db.get_value("Daily Production Log", {"docstatus": ["<", 2]}, "name", order_by="creation desc")
    
    if not name:
        return None
        
    doc = frappe.get_doc("Daily Production Log", name)
    doc_dict = doc.as_dict()
    
    # child table data is already in doc.as_dict() for table fields
    # but let's ensure it's structured as the JS expects
    doc_dict["production_data"] = [d.as_dict() for d in doc.production_data]
    
    return doc_dict
