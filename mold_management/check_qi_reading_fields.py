import frappe
import json

def get_fields():
    result = {}
    try:
        for dt in ['Item Quality Inspection Parameter', 'Quality Inspection Reading']:
            meta = frappe.get_meta(dt)
            result[dt] = [f.fieldname for f in meta.fields]
            
        with open('doctype_fields.json', 'w') as f:
            json.dump(result, f, indent=4)
        print("Success: Fields written to doctype_fields.json")
    except Exception as e:
        print("ERROR:", str(e))

if __name__ == "__main__":
    get_fields()
