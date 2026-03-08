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
