import frappe
import json

def check_fields():
    results = {}
    for doctype in ["Job Card", "Job Card Time Log"]:
        try:
            meta = frappe.get_meta(doctype)
            results[doctype] = [f.fieldname for f in meta.fields]
        except Exception as e:
            results[doctype] = str(e)
    
    print("---FIELDS_START---")
    print(json.dumps(results, indent=2))
    print("---FIELDS_END---")

if __name__ == "__main__":
    check_fields()
