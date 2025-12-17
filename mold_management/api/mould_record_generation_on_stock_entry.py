# import frappe

# def create_mould_on_stock_entry(doc, method):
#     """
#     Hook to create Mould records when Stock Entry of type Manufacture is submitted.
#     """
#     message = ""

#     if doc.stock_entry_type != "Manufacture":
#         message = "Mould not created: Stock Entry type is not Manufacture"

#     elif not doc.work_order:
#         message = "Mould not created: Work Order not linked"

#     else:
#         wo = frappe.get_doc("Work Order", doc.work_order)

#         if not wo.is_mould_item:
#             message = f"Mould not created: Is Mould Item unchecked in Work Order {wo.name}"

#         elif int(wo.produced_qty or 0) <= 0:
#             message = f"Mould not created: Produced Qty is 0 in Work Order {wo.name}"

#         elif frappe.db.exists("Mould", {"work_order": wo.name, "stock_entry": doc.name}):
#             message = f"Mould already exists for Work Order {wo.name}"

#         else:
#             created = 0
#             qty = int(wo.produced_qty)

#             for i in range(qty):
#                 mould = frappe.get_doc({
#                     "doctype": "Mould",
#                     # "work_order": wo.name,
#                     # "stock_entry": doc.name,
#                     "mould_name": getattr(wo,"mould_name", None),
#                     "part_code": getattr(wo,"production_item", None),
#                     "mould_type": getattr(wo, "mould_ti", None),
#                     "shape": getattr(wo, "shape", None),
#                     "material_type": getattr(wo, "material_type", None),
#                     "is_side_core": getattr(wo, "side_cores", 0),
#                     "side_core": getattr(wo, "side_cores_qty", 0),
#                     "cavity_count": getattr(wo, "no_of_cavity", 0),
#                     "hot_runner_system": getattr(wo, "hot_runner_system", None),
#                     "cold_runner_system": getattr(wo, "cold_runner_system", None),
#                     "total_shots": getattr(wo, "total_shots", 0),
#                     "mould_life": getattr(wo, "tool_life", 0)
#                 })
#                 mould.insert(ignore_permissions=True)
#                 created += 1

#             message = f"{created} Mould record(s) created for Work Order {wo.name}"

#     # Always add a comment to Stock Entry
#     doc.add_comment("Info", message)




# import frappe

# def create_mould_on_stock_entry(doc, method):
#     """
#     Hook to create Mould records when Stock Entry of type Manufacture is submitted.
#     """
#     message = ""

#     # 1. Only Manufacture Stock Entry
#     if doc.stock_entry_type != "Manufacture":
#         message = "Mould not created: Stock Entry type is not Manufacture"

#     # 2. Work Order mandatory
#     elif not doc.work_order:
#         message = "Mould not created: Work Order not linked"

#     else:
#         wo = frappe.get_doc("Work Order", doc.work_order)

#         # 3. Checkbox validations
#         if not wo.is_mould_item:
#             message = f"Mould not created: 'Is Mould Item' unchecked in Work Order {wo.name}"

#         elif not wo.maintain_stock:
#             message = f"Mould not created: 'Maintain Stock' must be enabled in Work Order {wo.name}"

#         elif not wo.is_customer_provided_item:
#             message = f"Mould not created: 'Is Customer Provided Item' must be enabled in Work Order {wo.name}"

#         elif wo.is_fixed_asset:
#             message = f"Mould not created: 'Is Fixed Asset' must be unchecked in Work Order {wo.name}"

#         elif int(wo.produced_qty or 0) <= 0:
#             message = f"Mould not created: Produced Qty is 0 in Work Order {wo.name}"

#         elif frappe.db.exists(
#             "Mould",
#             {"work_order": wo.name, "stock_entry": doc.name}
#         ):
#             message = f"Mould already exists for Work Order {wo.name}"

#         else:
#             created = 0
#             qty = int(wo.produced_qty)

#             for _ in range(qty):
#                 mould = frappe.get_doc({
#                     "doctype": "Mould",
#                     "work_order": wo.name,
#                     "stock_entry": doc.name,
#                     "mould_name": wo.get("mould_name"),
#                     "part_code": wo.get("production_item"),
#                     "mould_type": wo.get("mould_ti"),
#                     "shape": wo.get("shape"),
#                     "material_type": wo.get("material_type"),
#                     "is_side_core": wo.get("side_cores", 0),
#                     "side_core": wo.get("side_cores_qty", 0),
#                     "cavity_count": wo.get("no_of_cavity", 0),
#                     "hot_runner_system": wo.get("hot_runner_system"),
#                     "cold_runner_system": wo.get("cold_runner_system"),
#                     "total_shots": wo.get("total_shots", 0),
#                     "mould_life": wo.get("tool_life", 0)
#                 })

#                 mould.insert(ignore_permissions=True)
#                 created += 1

#             message = f"{created} Mould record(s) created for Work Order {wo.name}"

#     # Always log result on Stock Entry
#     doc.add_comment("Info", message)




# import frappe
# from frappe.utils import today

# def create_mould_on_stock_entry(doc, method):
#     """
#     Create Mould records and optionally Asset
#     based on Work Order flags.
#     """
#     message = ""

#     if doc.stock_entry_type != "Manufacture":
#         message = "Mould not created: Stock Entry type is not Manufacture"

#     elif not doc.work_order:
#         message = "Mould not created: Work Order not linked"

#     else:
#         wo = frappe.get_doc("Work Order", doc.work_order)

#         # Common validations
#         if not wo.is_mould_item:
#             message = f"Mould not created: 'Is Mould Item' unchecked in Work Order {wo.name}"

#         elif int(wo.produced_qty or 0) <= 0:
#             message = f"Mould not created: Produced Qty is 0 in Work Order {wo.name}"

#         else:
#             created = 0
#             qty = int(wo.produced_qty)

#             # -------------------------------
#             # CASE 1: Only Mould
#             # -------------------------------
#             if (
#                 wo.maintain_stock
#                 and wo.is_customer_provided_item
#                 and not wo.is_fixed_asset
#             ):
#                 for _ in range(qty):
#                     create_mould(wo, doc)
#                     created += 1

#                 message = f"{created} Mould record(s) created for Work Order {wo.name}"

#             # -------------------------------
#             # CASE 2: Mould + Asset
#             # -------------------------------
#             elif (
#                 not wo.maintain_stock
#                 and not wo.is_customer_provided_item
#                 and wo.is_fixed_asset
#             ):
#                 for _ in range(qty):
#                     create_mould(wo, doc)
#                     created += 1

#                 asset = create_asset_from_work_order(wo)
#                 message = (
#                     f"{created} Mould record(s) created and "
#                     f"Asset {asset.name} created & submitted for Work Order {wo.name}"
#                 )

#             else:
#                 message = (
#                     f"Mould not created: Work Order {wo.name} flags "
#                     f"do not match any valid condition"
#                 )

#     doc.add_comment("Info", message)


# # ---------------------------------------------------
# # Helper: Create Mould
# # ---------------------------------------------------
# def create_mould(wo, doc):
#     mould = frappe.get_doc({
#         "doctype": "Mould",
#         "work_order": wo.name,
#         "stock_entry": doc.name,
#         "mould_name": wo.get("mould_name"),
#         "part_code": wo.get("production_item"),
#         "mould_type": wo.get("mould_ti"),
#         "shape": wo.get("shape"),
#         "material_type": wo.get("material_type"),
#         "is_side_core": wo.get("side_cores", 0),
#         "side_core": wo.get("side_cores_qty", 0),
#         "cavity_count": wo.get("no_of_cavity", 0),
#         "hot_runner_system": wo.get("hot_runner_system"),
#         "cold_runner_system": wo.get("cold_runner_system"),
#         "total_shots": wo.get("total_shots", 0),
#         "mould_life": wo.get("tool_life", 0)
#     })
#     mould.insert(ignore_permissions=True)


# # ---------------------------------------------------
# # Helper: Create & Submit Asset
# # ---------------------------------------------------
# def create_asset_from_work_order(wo):
#     asset = frappe.get_doc({
#         "doctype": "Asset",
#         "asset_name": wo.production_item,
#         "item_code": wo.production_item,
#         "location": "Pune",

#         # Mandatory fields → set minimal safe values
#         "purchase_receipt": None,
#         "purchase_invoice": None,
#         "available_for_use_date": today(),
#         "gross_purchase_amount": 0,
#         "is_existing_asset": 1
#     })

#     asset.flags.ignore_mandatory = True
#     asset.insert(ignore_permissions=True)
#     asset.submit()

#     return asset



import frappe
from frappe.utils import today

def create_mould_on_stock_entry(doc, method):
    """
    Create Mould records and optionally Asset
    based on Work Order flags.
    """

    message = ""

    # --------------------------------------------------
    # Basic validations
    # --------------------------------------------------
    if doc.stock_entry_type != "Manufacture":
        message = "Mould not created: Stock Entry type is not Manufacture"

    elif not doc.work_order:
        message = "Mould not created: Work Order not linked"

    else:
        wo = frappe.get_doc("Work Order", doc.work_order)

        if not wo.is_mould_item:
            message = f"Mould not created: 'Is Mould Item' unchecked in Work Order {wo.name}"

        elif int(wo.produced_qty or 0) <= 0:
            message = f"Mould not created: Produced Qty is 0 in Work Order {wo.name}"

        else:
            qty = int(wo.produced_qty)
            mould_created = 0
            asset_created = None

            # ==================================================
            # CASE 1 → ONLY MOULD
            # is_mould_item = Yes
            # maintain_stock = Yes
            # is_customer_provided_item = Yes
            # is_fixed_asset = No
            # ==================================================
            if (
                wo.is_mould_item
                and wo.maintain_stock
                and wo.is_customer_provided_item
                and not wo.is_fixed_asset
            ):
                for _ in range(qty):
                    create_mould(wo, doc)
                    mould_created += 1

                message = (
                    f"{mould_created} Mould record(s) created "
                    f"for Work Order {wo.name}"
                )

            # ==================================================
            # CASE 2 → MOULD + ASSET
            # is_mould_item = Yes
            # maintain_stock = No
            # is_customer_provided_item = No
            # is_fixed_asset = Yes
            # ==================================================
            elif (
                wo.is_mould_item
                and not wo.maintain_stock
                and not wo.is_customer_provided_item
                and wo.is_fixed_asset
            ):
                for _ in range(qty):
                    create_mould(wo, doc)
                    mould_created += 1

                asset_created = create_asset_from_work_order(wo)

                message = (
                    f"{mould_created} Mould record(s) created and "
                    f"Asset {asset_created.name} created & submitted "
                    f"for Work Order {wo.name}"
                )

            else:
                message = (
                    f"Mould not created: Work Order {wo.name} "
                    f"does not match any valid configuration"
                )

    # --------------------------------------------------
    # Always log message in Stock Entry
    # --------------------------------------------------
    doc.add_comment("Info", message)


# ==================================================
# Helper → Create Mould
# ==================================================
def create_mould(wo, doc):
    mould = frappe.get_doc({
        "doctype": "Mould",
        "work_order": wo.name,
        "stock_entry": doc.name,
        "mould_name": wo.get("mould_name"),
        "part_code": wo.get("production_item"),
        "mould_type": wo.get("mould_ti"),
        "shape": wo.get("shape"),
        "material_type": wo.get("material_type"),
        "is_side_core": wo.get("side_cores", 0),
        "side_core": wo.get("side_cores_qty", 0),
        "cavity_count": wo.get("no_of_cavity", 0),
        "hot_runner_system": wo.get("hot_runner_system"),
        "cold_runner_system": wo.get("cold_runner_system"),
        "total_shots": wo.get("total_shots", 0),
        "mould_life": wo.get("tool_life", 0)
    })

    mould.insert(ignore_permissions=True)


# ==================================================
# Helper → Create & Submit Asset (MANDATORY SAFE)
# ==================================================
def create_asset_from_work_order(wo):
    asset = frappe.get_doc({
        "doctype": "Asset",
        "asset_name": wo.mould_name,
        "item_code": wo.production_item,
        "location": "Pune",

        # -------------------------------
        # Mandatory Asset Fields
        # -------------------------------
        "purchase_date": today(),
        "available_for_use_date": today(),
        "gross_purchase_amount": 0,

        # Optional
        "purchase_receipt": None,
        "is_existing_asset": 0
    })

    asset.insert(ignore_permissions=True)
    asset.submit()

    return asset
