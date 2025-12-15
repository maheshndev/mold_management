import frappe

def create_mould_on_stock_entry(doc, method):
    """
    Hook to create Mould records when Stock Entry of type Manufacture is submitted.
    """
    message = ""

    if doc.stock_entry_type != "Manufacture":
        message = "Mould not created: Stock Entry type is not Manufacture"

    elif not doc.work_order:
        message = "Mould not created: Work Order not linked"

    else:
        wo = frappe.get_doc("Work Order", doc.work_order)

        if not wo.is_mould_item:
            message = f"Mould not created: Is Mould Item unchecked in Work Order {wo.name}"

        elif int(wo.produced_qty or 0) <= 0:
            message = f"Mould not created: Produced Qty is 0 in Work Order {wo.name}"

        elif frappe.db.exists("Mould", {"work_order": wo.name, "stock_entry": doc.name}):
            message = f"Mould already exists for Work Order {wo.name}"

        else:
            created = 0
            qty = int(wo.produced_qty)

            for i in range(qty):
                mould = frappe.get_doc({
                    "doctype": "Mould",
                    # "work_order": wo.name,
                    # "stock_entry": doc.name,
                    "mould_name": getattr(wo,"mould_name", None),
                    "part_code": getattr(wo,"production_item", None),
                    "mould_type": getattr(wo, "mould_ti", None),
                    "shape": getattr(wo, "shape", None),
                    "material_type": getattr(wo, "material_type", None),
                    "is_side_core": getattr(wo, "side_cores", 0),
                    "side_core": getattr(wo, "side_cores_qty", 0),
                    "cavity_count": getattr(wo, "no_of_cavity", 0),
                    "hot_runner_system": getattr(wo, "hot_runner_system", None),
                    "cold_runner_system": getattr(wo, "cold_runner_system", None),
                    "total_shots": getattr(wo, "total_shots", 0),
                    "mould_life": getattr(wo, "tool_life", 0)
                })
                mould.insert(ignore_permissions=True)
                created += 1

            message = f"{created} Mould record(s) created for Work Order {wo.name}"

    # Always add a comment to Stock Entry
    doc.add_comment("Info", message)
