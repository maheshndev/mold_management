import frappe

def check_qi_fields():
    frappe.init(".")
    frappe.connect()
    meta = frappe.get_meta("Quality Inspection")
    fields = [f.fieldname for f in meta.fields]
    print("FIELDS:", fields)
    
if __name__ == "__main__":
    check_qi_fields()
