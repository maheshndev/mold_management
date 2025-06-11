import frappe

@frappe.whitelist()
def get_predictive_data():
    data = []
    index = 1

    # Fetch all Mold Parameter documents
    mold_parameters = frappe.get_all("Mold Parameter", fields=["name", "suggestive_action"])

    for param in mold_parameters:
        param_doc = frappe.get_doc("Mold Parameter", param.name)

        for row in param_doc.parameters:
            mold_no = row.mold_no
            date_time = row.date_and_time
            parameter_name = row.parameter
            value = float(row.value or 0)

            # Fetch the Mold document to get the standard value from critical_parameters
            standard_value = 0
            try:
                mold_doc = frappe.get_doc("Mold", mold_no)
                for cp in mold_doc.critical_parameters:
                    if cp.parameter == parameter_name:
                        standard_value = float(cp.value or 0)
                        break
            except frappe.DoesNotExistError:
                # Mold not found, skip or handle appropriately
                continue

            data.append({
                "no": index,
                "date_time": date_time,
                "mold_no": mold_no,
                "parameter": parameter_name,
                "value": value,
                "standard_value": standard_value,
                "difference": value - standard_value,
                "suggestive_action": param.suggestive_action
            })
            index += 1

    return data