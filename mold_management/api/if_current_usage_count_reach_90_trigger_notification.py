import frappe

def check_mould_usage(doc, method=None):
    # doc is already passed by the on_update hook
    current = frappe.utils.flt(doc.current_usage_count)
    maximum = frappe.utils.flt(doc.maximum_usage_count)

    if maximum > 0:
        percentage = (current / maximum) * 100

        if 90 <= percentage < 100 and not doc.email_sent_90_percent:

            users_to_notify = [
                "kulkarnirahul134@gmail.com",
                "rkulkarni@assimilatetechnologies.com"
            ]

            for user_email in users_to_notify:

                # Create Notification Log
                notification = frappe.new_doc("Notification Log")
                notification.subject = f"⚠️ Mould {doc.name} Reached 90% Shot Capacity"
                notification.for_user = user_email
                notification.type = "Alert"
                notification.document_type = "Mould"
                notification.document_name = doc.name
                notification.from_user = frappe.session.user
                # notification.email_content = (
                #     f"<b>Warning!</b><br>"
                #     f"Mould <b>{doc.name}</b> has reached <b>{percentage:.2f}%</b> of its shot capacity.<br><br>"
                #     f"Current Usage Count: <b>{current}</b><br>"
                #     f"Maximum Usage Count: <b>{maximum}</b><br><br>"
                #     f"Please take necessary action."
                    
                # )

                notification.email_content = (
                    f"<b>⚠️ Warning!</b><br><br>"
                    f"Mould <b>{doc.name}</b> has reached <b>{percentage:.2f}%</b> of its shot capacity.<br><br>"
                    f"<b>📊 Usage Details:</b><br>"
                    f"Current Usage Count: <b>{current}</b><br>"
                    f"Maximum Usage Count: <b>{maximum}</b><br><br>"
                    f"Please take the necessary action to avoid production disruption.<br><br>"
                    f"Regards,<br>"
                    f"<b>ERPNext Team</b>"
                )


                notification.insert(ignore_permissions=True)

                # Send Email
                frappe.sendmail(
                    recipients=[user_email],
                    subject=f"⚠️ Mould {doc.name} Reached 90% Shot Capacity",
                    message=notification.email_content,
                    delayed=False
                )

            # Mark email as sent
            frappe.db.set_value("Mould", doc.name, "email_sent_90_percent", 1)
            frappe.db.commit()
