import frappe

def execute():
    # Step 1: Create Tab Break for "Mould Details"
    if not frappe.db.exists("Custom Field", {"dt": "Item", "fieldname": "mould_details_tab"}):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Item",
            "fieldname": "mould_details_tab",
            "label": "Mould Details",
            "fieldtype": "Tab Break",
            "insert_after": "manufacturing"
        }).insert(ignore_permissions=True)

    # Step 2: Create Section Break inside Mould Details tab
    if not frappe.db.exists("Custom Field", {"dt": "Item", "fieldname": "Mould_details_section"}):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Item",
            "fieldname": "Mould_details_section",
            "label": "Mould Details Section",
            "fieldtype": "Section Break",
            "insert_after": "mould_details_tab"
        }).insert(ignore_permissions=True)

    

    

    # Step 3: Create custom fields under the section
    custom_fields = [
        
        # {
        # "fieldname": "mould",
        # "label": "Mould",
        # "fieldtype": "",
        # "options": "Mould Selection",
        # "insert_after": "Mould_details_section"
        # },
        # {
        # "fieldname": "mould_type",
        # "fieldtype": "Link",
        # "label": "Mould Type",
        # "options": "Mould Type",
        # "insert_after": "mould"
        # },
        # {
        # "fieldname": "total_shot",
        # "fieldtype": "Data",
        # "label": "Total Shot Count",
        #  "insert_after": "mould_type"
        # },
        # {
        #     "fieldname": "cavity_coun",
        #     "fieldtype": "Float",
        #     "label": "No of Cavity",
        #     "insert_after": "total_shot"
        # },
        # {
        # "fieldname": "mould_lif",
        # "fieldtype": "Data",
        # "label": "Mould Life (Years)",
        # "insert_after": "cavity_coun"
        # },
        
        # {
        #  "fieldname": "mould_nam",
        #  "fieldtype": "Data",
        #  "label": "Mould Name",
        #  "insert_after": "mould_lif"
        # },
        # {
        #     "fieldname": "shap",
        #     "fieldtype": "Link",
        #     "options": "Shape",
        #     "label": "Shape",
        #     "insert_after": "mould_nam"
        # },
        # {
        #     "fieldname": "material_typ",
        #     "fieldtype": "Link",
        #     "options": "Material Type",
        #     "label": "Material Type",
        #     "insert_after": "shap"
        # },
        # {
        #     "fieldname": "Tool_le",
        #     "field_type": "Data",
        #     "label": "Mould Life (Years)",
        #     "insert_after": "material_typ"
        # },
        # {
        #     "fieldname": "total_shot",
        #     "field_type": "Data",
        #     "label": "Total Shots",
        #     "insert_after": "Tool_le"
        # },
        # {
        #     "fieldname": "is_side",
        #     "field_type": "Select",
        #     "options": "\nYes\nNo\",
        #     "label": "Is Side Core",
        #     "insert_after": "total_shot"
        # },
        # {
        #     "fieldname": "side_core",
        #     "field_type": "Data",
        #     "label": "Side Core Nos",
        #     "insert_after": "is_side"
        # }
        
    ]

    


    for field in custom_fields:
        if not frappe.db.exists("Custom Field", {"dt": "Item", "fieldname": field["fieldname"]}):
            frappe.get_doc({
                "doctype": "Custom Field",
                "dt": "Item",
                **field
            }).insert(ignore_permissions=True)

    frappe.db.commit()
