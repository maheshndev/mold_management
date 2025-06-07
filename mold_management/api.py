import frappe

@frappe.whitelist(allow_guest=False)
def get_mold_data(status=None, products_parts=None, from_date=None, to_date=None):
    filters = {}

    if status:
        filters["status"] = status
    if products_parts:
        filters["products_parts"] = ["like", f"%{products_parts}%"]
    if from_date and to_date:
        filters["last_maintenance_date"] = ["between", [from_date, to_date]]

    molds = frappe.get_all(
        "Mold",
        filters=filters,
        fields=[
            "name as mold_id",
            "mold_type",
            "products_parts",
            "location",
            "last_maintenance_date",
            "current_usage_count",
            "next_maintenance_due",
            "mold_life",
            "status"
        ],
        order_by="name"
    )
    return molds


@frappe.whitelist(allow_guest=False)
def get_maintenance_alerts():
    alerts = frappe.get_all(
        "Maintenance Alert",
        fields=["name as alert_id", "mold", "alert_type", "alert_date", "description"],
        order_by="alert_date desc"
    )
    return alerts
