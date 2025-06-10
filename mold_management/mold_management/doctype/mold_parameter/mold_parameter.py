# Copyright (c) 2025, assimilate and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class MoldParameter(Document):
	pass


@frappe.whitelist()
def get_parameters_for_mold(doctype, txt, searchfield, start, page_len, filters):
    mold_no = filters.get("mold_no")

    if not mold_no:
        return []

    return frappe.db.sql("""
        SELECT parameter
        FROM `tabParameters Table`
        WHERE parent = %s
        AND parameter LIKE %s
        LIMIT %s OFFSET %s
    """, (mold_no, f"%{txt}%", page_len, start))



@frappe.whitelist()
def get_parameter_details(parameter=None, mold_no=None):
    if not parameter or not mold_no:
        return {}

    return frappe.db.get_value(
        "Parameters Table",
        {
            "parent": mold_no,
            "parameter": parameter
        },
        ["value"],  # Add more fields if needed
        as_dict=True
    )
