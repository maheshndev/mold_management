# import frappe
# from frappe.utils import flt

# def sync_dpl_on_job_card_submit(doc, method=None):
#     """
#     Find and submit all Draft Daily Production Logs linked to the submitted Job Card.
#     """
#     logs = frappe.get_all("Daily Production Log", filters={
#         "job_card": doc.name,
#         "docstatus": 0
#     }, fields=["name"])

#     for log in logs:
#         dpl = frappe.get_doc("Daily Production Log", log.name)
#         try:
#             dpl.submit()
#             frappe.msgprint(f"Daily Production Log {log.name} has been automatically submitted.")
#         except Exception as e:
#             frappe.log_error(f"Error submitting Daily Production Log {log.name}: {str(e)}", "DPL Sync Error")

# def sync_dpl_on_job_card_cancel(doc, method=None):
#     """
#     Find and cancel all Submitted Daily Production Logs linked to the cancelled Job Card.
#     """
#     logs = frappe.get_all("Daily Production Log", filters={
#         "job_card": doc.name,
#         "docstatus": 1
#     }, fields=["name"])

#     for log in logs:
#         dpl = frappe.get_doc("Daily Production Log", log.name)
#         try:
#             dpl.cancel()
#             frappe.msgprint(f"Daily Production Log {log.name} has been automatically cancelled.")
#         except Exception as e:
#             frappe.log_error(f"Error cancelling Daily Production Log {log.name}: {str(e)}", "DPL Sync Error")

# def sync_dpl_on_work_order_submit(doc, method=None):
#     """
#     Find and submit all Draft Daily Production Logs linked to the submitted Work Order.
#     """
#     logs = frappe.get_all("Daily Production Log", filters={
#         "work_order": doc.name,
#         "docstatus": 0
#     }, fields=["name"])

#     for log in logs:
#         dpl = frappe.get_doc("Daily Production Log", log.name)
#         try:
#             dpl.submit()
#             frappe.msgprint(f"Daily Production Log {log.name} has been automatically submitted.")
#         except Exception as e:
#             frappe.log_error(f"Error submitting Daily Production Log {log.name}: {str(e)}", "DPL Sync Error")

# def sync_dpl_on_work_order_cancel(doc, method=None):
#     """
#     Find and cancel all Submitted Daily Production Logs linked to the cancelled Work Order.
#     """
#     logs = frappe.get_all("Daily Production Log", filters={
#         "work_order": doc.name,
#         "docstatus": 1
#     }, fields=["name"])

#     for log in logs:
#         dpl = frappe.get_doc("Daily Production Log", log.name)
#         try:
#             dpl.cancel()
#             frappe.msgprint(f"Daily Production Log {log.name} has been automatically cancelled.")
#         except Exception as e:
#             frappe.log_error(f"Error cancelling Daily Production Log {log.name}: {str(e)}", "DPL Sync Error")



import frappe
from frappe.utils import flt

def sync_dpl_on_job_card_submit(doc, method=None):
    """
    Find and submit all Draft Daily Production Logs linked to the submitted Job Card.
    """
    logs = frappe.get_all("Daily Production Log", filters={
        "job_card": doc.name,
        "docstatus": 0
    }, fields=["name"])

    for log in logs:
        dpl = frappe.get_doc("Daily Production Log", log.name)
        try:
            dpl.submit()
            frappe.msgprint(f"Daily Production Log {log.name} has been automatically submitted.")
        except Exception as e:
            frappe.log_error(f"Error submitting Daily Production Log {log.name}: {str(e)}", "DPL Sync Error")

def sync_quantities_from_logs(doc, method=None):
    """
    Forcefully sync total_completed_qty and process_loss_qty from all 
    submitted or draft Daily Production Logs during Job Card save/submission.
    """
    if not doc.name:
        return

    # Aggregate stats from all logs linked to this Job Card
    stats = frappe.db.sql("""
        SELECT SUM(total_ok_shots), SUM(total_rej_shots)
        FROM `tabDaily Production Log`
        WHERE job_card = %s AND docstatus < 2
    """, doc.name)[0]

    total_ok = flt(stats[0] or 0)
    total_rej = flt(stats[1] or 0)

    # If any logs exist, force the Job Card fields to match
    # We only overwrite if positive values are found, to avoid wiping manual entries if logs are not used
    if total_ok > 0 or total_rej > 0:
        doc.total_completed_qty = total_ok
        doc.process_loss_qty = total_rej
        
        # In v16, total_completed_qty might be summed from time_logs.
        # If we don't have enough time_logs, we might need to "fake" it here
        # but setting the field on the object in 'validate' usually persists it 
        # unless standard erpnext overrides it later in before_submit.
        
        # Safety: Cap process loss if it exceeds target to prevent sum > target error
        target = flt(doc.for_quantity or doc.qty or 0)
        if target > 0 and (total_ok + total_rej) > target:
            doc.process_loss_qty = max(0, target - total_ok)

    return

def sync_dpl_on_job_card_cancel(doc, method=None):
    """
    Find and cancel all Submitted Daily Production Logs linked to the cancelled Job Card.
    """
    logs = frappe.get_all("Daily Production Log", filters={
        "job_card": doc.name,
        "docstatus": 1
    }, fields=["name"])

    for log in logs:
        dpl = frappe.get_doc("Daily Production Log", log.name)
        try:
            dpl.cancel()
            frappe.msgprint(f"Daily Production Log {log.name} has been automatically cancelled.")
        except Exception as e:
            frappe.log_error(f"Error cancelling Daily Production Log {log.name}: {str(e)}", "DPL Sync Error")

def sync_dpl_on_work_order_submit(doc, method=None):
    """
    Find and submit all Draft Daily Production Logs linked to the submitted Work Order.
    """
    logs = frappe.get_all("Daily Production Log", filters={
        "work_order": doc.name,
        "docstatus": 0
    }, fields=["name"])

    for log in logs:
        dpl = frappe.get_doc("Daily Production Log", log.name)
        try:
            dpl.submit()
            frappe.msgprint(f"Daily Production Log {log.name} has been automatically submitted.")
        except Exception as e:
            frappe.log_error(f"Error submitting Daily Production Log {log.name}: {str(e)}", "DPL Sync Error")

def sync_dpl_on_work_order_cancel(doc, method=None):
    """
    Find and cancel all Submitted Daily Production Logs linked to the cancelled Work Order.
    """
    logs = frappe.get_all("Daily Production Log", filters={
        "work_order": doc.name,
        "docstatus": 1
    }, fields=["name"])

    for log in logs:
        dpl = frappe.get_doc("Daily Production Log", log.name)
        try:
            dpl.cancel()
            frappe.msgprint(f"Daily Production Log {log.name} has been automatically cancelled.")
        except Exception as e:
            frappe.log_error(f"Error cancelling Daily Production Log {log.name}: {str(e)}", "DPL Sync Error")
