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
