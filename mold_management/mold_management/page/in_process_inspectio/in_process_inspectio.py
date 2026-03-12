import frappe
from frappe import _
from frappe.utils import nowdate, flt

@frappe.whitelist()
def get_report_data(reference_name=None):
    if not reference_name:
        # Get the latest Job Card as default
        latest_jc = frappe.db.get_value("Job Card", {"docstatus": ["<", 2]}, "name", order_by="creation desc")
        if not latest_jc:
            return {}
        reference_name = latest_jc

    # Identify if it's a Job Card or Work Order
    is_jc = frappe.db.exists("Job Card", reference_name)
    is_wo = frappe.db.exists("Work Order", reference_name)

    job_cards = []
    work_order = None

    if is_jc:
        jc = frappe.get_doc("Job Card", reference_name)
        job_cards = [jc]
        if jc.work_order:
            work_order = frappe.get_doc("Work Order", jc.work_order)
    elif is_wo:
        work_order = frappe.get_doc("Work Order", reference_name)
        job_cards = frappe.get_all("Job Card", 
            filters={"work_order": reference_name, "docstatus": ["<", 2]},
            fields=["*"]
        )
    else:
        return {}

    report_data = []
    for jc in job_cards:
        sheet = build_sheet_data(jc, work_order)
        report_data.append(sheet)

    return report_data

def build_sheet_data(jc, wo):
    item = frappe.get_doc("Item", jc.production_item)
    
    # Fetch Template
    template_name = item.get("in_process_inspection_template") or item.get("quality_inspection_template")
    parameters = []
    if template_name:
        parameters = frappe.get_all("Item Quality Inspection Parameter",
            filters={"parent": template_name},
            fields=["*"],
            order_by="idx"
        )

    # Fetch Quality Inspections linked to this Job Card
    # Map them to time slots
    inspections = frappe.get_all("Quality Inspection",
        filters={"reference_name": jc.name, "docstatus": 1, "inspection_type": "In Process"},
        fields=["name", "report_date", "inspected_by", "time_slot"],
        order_by="time_slot asc"
    )

    for qi in inspections:
        qi.readings = frappe.get_all("Quality Inspection Reading",
            filters={"parent": qi.name},
            fields=["specification", "reading_value", "reading_1", "status"]
        )

    # Header Data
    operator = ""
    if jc.get("employees"):
        operator = jc.employees[0].employee_name
    elif jc.get("operator"):
        operator = frappe.db.get_value("Employee", jc.operator, "employee_name") or jc.operator

    return {
        "job_card": jc,
        "work_order": wo,
        "item": item,
        "parameters": parameters,
        "inspections": inspections,
        "operator": operator,
        "today": nowdate()
    }
