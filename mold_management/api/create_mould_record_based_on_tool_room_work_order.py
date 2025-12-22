# import frappe

# def create_mould_on_stock_entry(doc, method):
#     """
#     Hook to create Mould records when Stock Entry of type Manufacture is submitted
#     using Tool Room Work Order.
#     """
#     message = ""

#     if doc.stock_entry_type != "Manufacture":
#         message = "Mould not created: Stock Entry type is not Manufacture"

#     elif not doc.tool_room_work_order:
#         message = "Mould not created: Tool Room Work Order not linked"

#     else:
#         tro = frappe.get_doc("Tool Room Work Order", doc.tool_room_work_order)

#         if not tro.is_mould_item:
#             message = (
#                 f"Mould not created: Is Mould Item unchecked in "
#                 f"Tool Room Work Order {tro.name}"
#             )

#         elif int(tro.produced_qty or 0) <= 0:
#             message = (
#                 f"Mould not created: Produced Qty is 0 in "
#                 f"Tool Room Work Order {tro.name}"
#             )

#         elif frappe.db.exists(
#             "Mould",
#             {
#                 "tool_room_work_order": tro.name,
#                 "stock_entry": doc.name
#             }
#         ):
#             message = f"Mould already exists for Tool Room Work Order {tro.name}"

#         else:
#             created = 0
#             qty = int(tro.produced_qty)

#             for i in range(qty):
#                 mould = frappe.get_doc({
#                     "doctype": "Mould",
#                     # "tool_room_work_order": tro.name,
#                     # "stock_entry": doc.name,
#                     "mould_name": getattr(tro, "mould_name", None),
#                     "part_code": getattr(tro, "production_item", None),
#                     "mould_type": getattr(tro, "mould_ti", None),
#                     "shape": getattr(tro, "shape", None),
#                     "material_type": getattr(tro, "material_type", None),
#                     "is_side_core": getattr(tro, "side_cores", 0),
#                     "side_core": getattr(tro, "side_cores_qty", 0),
#                     "cavity_count": getattr(tro, "no_of_cavity", 0),
#                     "hot_runner_system": getattr(tro, "hot_runner_system", None),
#                     "cold_runner_system": getattr(tro, "cold_runner_system", None),
#                     "total_shots": getattr(tro, "total_shots", 0),
#                     "mould_life": getattr(tro, "tool_life", 0)
#                 })

#                 mould.insert(ignore_permissions=True)
#                 created += 1

#             message = f"{created} Mould record(s) created for Tool Room Work Order {tro.name}"

#     # Always add a comment to Stock Entry
#     doc.add_comment("Info", message)
