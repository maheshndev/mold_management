# import frappe

# def create_mould_on_submit(doc, method):
#     try:
#         mould = frappe.new_doc("Mould")
#         mould.mould_name = "2 Cavity"   # or fetch dynamically from Work Order items
#         mould.work_order = doc.name     # optional link back
#         mould.insert(ignore_permissions=True)
#         frappe.db.commit()              # ensure it's saved immediately
#         frappe.msgprint(f"Mould '{mould.mould_name}' created successfully!")
#     except Exception as e:
#         frappe.log_error(message=str(e), title="Mould Creation Failed")


# import frappe

# def create_mould_on_submit(doc, method):
#     try:
#         # Loop through each item in the required_items table
#         for item in doc.required_items:
#             # Only consider items marked as mould items
#             if item.is_mould_item:
#                 # Create 'required_qty' number of moulds for this item
#                 for i in range(int(item.required_qty or 0)):
#                     mould = frappe.new_doc("Mould")
#                     mould.mould_name = "2 Cavity"   # or dynamically fetch from item fields
#                     mould.work_order = doc.name     # optional link back
#                     mould.item_code = item.item_code  # optional: link to item
#                     mould.insert(ignore_permissions=True)

#         frappe.db.commit()  # ensure all records are saved immediately
#         frappe.msgprint("Mould records created successfully based on required items!")

#     except Exception as e:
#         frappe.log_error(message=str(e), title="Mould Creation Failed")



import frappe

def create_mould_on_submit(doc, method):
    try:
        # Loop through each item in the required_items table
        for item in doc.required_items:
            # Only consider items marked as mould items
            if item.is_mould_item:
                # Create 'required_qty' number of moulds for this item
                for i in range(int(item.required_qty or 0)):
                    mould = frappe.new_doc("Mould")
                    
                    # Mapping fields from required_items to Mould
                    # mould.mould_name = f"2 Cavity - {i+1}"  # Can customize if needed
                    mould.work_order = doc.name
                    mould.part_code = item.item_code
                    mould.shape = item.shape
                    mould.material_type = item.material_type
                    mould.is_side_core = item.side_cores  # Yes/No select field
                    mould.side_core = item.side_cores_qty
                    mould.cavity_count = item.no_of_cavity
                    mould.total_shots = item.total_shots
                    mould.mould_life = item.tool_life
                    mould.hot_runner_system = item.hot_runner_system  # Yes/No select field
                    mould.cold_runner_system = item.cold_runner_system  # Yes/No select field

                    # Insert the record
                    mould.insert(ignore_permissions=True)

        frappe.db.commit()  # ensure all records are saved immediately
        # frappe.msgprint("Mould records created successfully based on required items!")

    except Exception as e:
        frappe.log_error(message=str(e), title="Mould Creation Failed")
