import frappe
 
def execute():
    notification_name = "Mould Maintenance"
    exists = frappe.db.exists("Notification", notification_name)
    if exists:
        doc = frappe.get_doc("Notification", notification_name)
    else:
        doc = frappe.new_doc("Notification")
        doc.name = notification_name
 
    doc.subject = "Mould Maintenance {{doc.mould_name}}"
    doc.channel = "Email"
    doc.enabled = 1
    doc.document_type = "Mould"
    doc.reference_date = "next_maintenance_due"
    doc.date_field = "next_maintenance_due"
    doc.event = "Days Before"
    doc.days = 7
    doc.days_before = 7
    doc.send_system_notification = 1
    doc.sender = ""
 
    doc.set("recipients", [])
    doc.append("recipients", {
        "receiver_by_role": "System Manager",
        "receiver_by_document_field": "",
        "condition": ""
    })
 
    doc.flags.ignore_validate = True
    if exists:
        doc.save(ignore_permissions=True)
    else:
        doc.insert(ignore_permissions=True)
    frappe.db.commit()
 
 

 