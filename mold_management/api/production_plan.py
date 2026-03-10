import frappe
import json

def populate_operations_from_bom(doc, method):
    """
    On validate of Production Plan, automatically fetch operations from the BOM
    for each po_item and sub_assembly_item, if the item has no operations listed.
    """
    for table_name in ["po_items", "sub_assembly_items"]:
        items = doc.get(table_name) or []
        for item in items:
            # If the row has a bom_no but its nested 'operations_data' is empty
            if item.bom_no and not item.get("operations_data"):
                try:
                    bom = frappe.get_doc("BOM", item.bom_no)
                    ops = []
                    for op in bom.operations:
                        ops.append({
                            "operation": op.operation,
                            "workstation": op.workstation,
                            "mould": "" 
                        })
                    item.operations_data = json.dumps(ops)
                except Exception as e:
                    frappe.log_error(f"Error fetching operations for BOM {item.bom_no}: {str(e)}", "Production Plan BOM Fetch")

def map_production_plan_operations(doc, method=None):
    """
    Called on before_insert of Work Order.
    Maps workstation and mould from Production Plan Item/Sub Assembly Item to Work Order Operations.
    """
    if not doc.production_plan:
        return

    source_row = None
    if doc.get("production_plan_item"):
        source_row = frappe.get_doc("Production Plan Item", doc.production_plan_item)
    elif doc.get("production_plan_sub_assembly_item"):
        source_row = frappe.get_doc("Production Plan Sub Assembly Item", doc.production_plan_sub_assembly_item)

    if not source_row or not source_row.operations_data:
        return

    try:
        ops_data = json.loads(source_row.operations_data)
        if not ops_data:
            return

        # Create a mapping of operation name to its details
        op_map = {op.get("operation"): op for op in ops_data}

        for wo_op in doc.get("operations") or []:
            if wo_op.operation in op_map:
                custom_op = op_map[wo_op.operation]
                if custom_op.get("workstation"):
                    wo_op.workstation = custom_op.get("workstation")
                if custom_op.get("mould"):
                    wo_op.mould = custom_op.get("mould")
                    
    except Exception as e:
        frappe.log_error(f"Error mapping operations from Production Plan {doc.production_plan}: {str(e)}", "Work Order Op Mapping")
