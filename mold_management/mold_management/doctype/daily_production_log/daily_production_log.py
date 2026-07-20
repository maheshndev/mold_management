# Copyright (c) 2025, Assimilate Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class DailyProductionLog(Document):
    pass


@frappe.whitelist()
def get_jobcard_details(job_card):
    jobcard = frappe.get_doc("Job Card", job_card)
    
    # Fetch related Mold (assuming mold is linked in Job Card)
    mold = jobcard.get("mold") or None
    
    # Fetch related Quality Inspection (if any linked)
    q_inspections = frappe.get_all(
        "Quality Inspection",
        filters={"reference_name": job_card},
        fields=["name"]
    )

    parameters = []
    for qi in q_inspections:
        qi_doc = frappe.get_doc("Quality Inspection", qi.name)
        for row in qi_doc.readings:
            parameters.append({
                "specification": row.specification,
                "reading_value": row.reading_value or row.reading_1,
                "parameter_group": frappe.db.get_value("Quality Inspection Parameter", row.specification, "parameter_group")
            })

    return {
        "mold": mold,
        "operation": jobcard.operation,
        "item_code": jobcard.item_code,
        "parameters": parameters
    }
@frappe.whitelist()
def create_daily_production_log(doc, method):
    """Auto-create Daily Production Log when Job Card is created"""
    log = frappe.new_doc("Daily Production Log")
    log.job_card = doc.name
    log.item_code = doc.item_code
    log.mold = getattr(doc, "mold", None)
    log.operation = doc.operation

    # Fetch Quality Inspection Parameters linked to Job Card
    q_inspections = frappe.get_all(
        "Quality Inspection",
        filters={"reference_name": doc.name},
        fields=["name"]
    )
    
    for qi in q_inspections:
        qi_doc = frappe.get_doc("Quality Inspection", qi.name)
        for row in qi_doc.readings:
            log.append("quality_parameters", {
                "specification": row.specification,
                "reading_value": row.reading_value or row.reading_1,
                "parameter_group": frappe.db.get_value("Quality Inspection Parameter", row.specification, "parameter_group")
            })

    log.insert(ignore_permissions=True)
    frappe.db.commit()
