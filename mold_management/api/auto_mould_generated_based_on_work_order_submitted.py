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







