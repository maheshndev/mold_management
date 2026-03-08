import frappe
from frappe.model.document import Document
from frappe.utils import flt, nowdate, getdate, time_diff
import math
 
class DailyProductionLog(Document):
    def validate(self):
        self.calculate_totals()
        self.set_operator_name()
 
    def set_operator_name(self):
        if self.operator and not self.operator_name:
            self.operator_name = frappe.db.get_value("Employee", self.operator, "employee_name")
 
    def calculate_totals(self):
        total_ok = 0
        total_rej = 0
       
        for row in self.production_data:
            # Update row total
            row.total_shots = flt(row.ok_shots) + flt(row.rej_shots)
            total_ok += flt(row.ok_shots)
            total_rej += flt(row.rej_shots)
       
        self.total_ok_shots = total_ok
        self.total_rej_shots = total_rej
        self.total_shots = total_ok + total_rej
       
        # Update last_counter
        self.last_counter = flt(self.first_counter or 0) + self.total_shots
       
        # Dynamic Target Calculation
        if self.cycle_time and self.running_cavity:
            shift_hours = get_shift_hours(self.shift)
            # shift_target = (shift_hours * 3600 / cycle_time) * running_cavity
            self.shift_target = math.floor((shift_hours * 3600 / flt(self.cycle_time)) * flt(self.running_cavity))
            self.hourly_target = math.floor(self.shift_target / shift_hours)
 
        # RM Consumption calculation
        if self.shot_weight or self.runner_weight:
            s_wt = flt(self.shot_weight)
            r_wt = flt(self.runner_weight)
            self.rm_consumption = (s_wt + r_wt) * self.total_shots / 1000
 
def get_shift_hours(shift_name):
    if not shift_name:
        return 12.0
   
    shift_type = frappe.db.get_value("Shift Type", shift_name, ["start_time", "end_time"], as_dict=1)
    if shift_type and shift_type.start_time and shift_type.end_time:
        diff = time_diff(shift_type.end_time, shift_type.start_time)
        hours = diff.total_seconds() / 3600
        if hours < 0: hours += 24 # Handle overnight shift
        return hours or 12.0
    return 12.0
 
@frappe.whitelist()
def get_shift_hours_api(shift_name):
    return get_shift_hours(shift_name)
 
@frappe.whitelist()
def get_job_card_details(job_card, machine_no=None, mould=None):
    if not job_card:
        return {}
   
    jc = frappe.get_doc("Job Card", job_card)
    operator = jc.get("operator")
    # Handle "employee" being a child table or Table MultiSelect
    if not operator and jc.get("employee"):
        emp = jc.get("employee")
        if isinstance(emp, list) and len(emp) > 0:
            operator = emp[0].get("employee")
        elif hasattr(emp, "__iter__") and not isinstance(emp, (str, dict)):
            # It's a Table/List but not a string
            emp_list = list(emp)
            if emp_list:
                operator = emp_list[0].get("employee")
        else:
            operator = emp
 
    details = {
        "job_card": job_card,
        "doc_no": job_card,
        "company": jc.company,
        "work_order": jc.work_order,
        "item_code": jc.production_item,
        "machine_no": jc.workstation,
        "mould": jc.get("mould") or jc.get("mold"),
        "operator": operator,
        "report_date": jc.posting_date or nowdate()
    }
 
    if details["operator"] and isinstance(details["operator"], str):
        details["operator_name"] = frappe.db.get_value("Employee", details["operator"], "employee_name")
 
    # Fetch Work Order shift if missing
    if jc.work_order:
        details["shift"] = frappe.db.get_value("Work Order", jc.work_order, "shift")
 
    # Fetch Item details
    if details["item_code"]:
        item = frappe.get_doc("Item", details["item_code"])
        details.update({
            "product_name": item.item_name,
            "shot_weight": item.get("shot_wt"),
            "runner_weight": item.get("runner_wt"),
            "rev_no": item.get("rev_no"),
            "page_no": item.get("page_no"),
            "cycle_time": item.get("cycle_time"),
            "anti_static": item.get("anti_static"),
            "raw_material": item.get("raw_material"),
            "masterbatch": item.get("masterbatch")
        })
 
    # If RM or Masterbatch is missing, try to find them in Job Card items
    if hasattr(jc, "items") and jc.items:
        for item_row in jc.items:
            i_name = (item_row.item_name or frappe.db.get_value("Item", item_row.item_code, "item_name") or "").upper()
            if "MASTERBATCH" in i_name:
                if not details.get("masterbatch"):
                    details["masterbatch"] = item_row.item_code
                if item_row.item_code == details.get("masterbatch"):
                    details["masterbatch_batch_no"] = item_row.batch_no
            else:
                if not details.get("raw_material"):
                    details["raw_material"] = item_row.item_code
                if item_row.item_code == details.get("raw_material"):
                    details["raw_material_batch_no"] = item_row.batch_no
 
    # Fetch grades after potential RM/MB update
    if details.get("raw_material"):
        details["raw_material_grade"] = frappe.db.get_value("Item", details["raw_material"], "item_name")
    if details.get("masterbatch"):
        details["masterbatch_grade"] = frappe.db.get_value("Item", details["masterbatch"], "item_name")
 
    # Fetch Mould details
    mould_code = details["mould"] or mould
    if mould_code:
        m_doc = frappe.get_doc("Mould", mould_code)
        if not details.get("shot_weight"): details["shot_weight"] = m_doc.get("shot_weight")
        if not details.get("runner_weight"): details["runner_weight"] = m_doc.get("runner_weight")
        if not details.get("total_cavity"): details["total_cavity"] = m_doc.get("cavity_count")
        if not details.get("running_cavity"): details["running_cavity"] = m_doc.get("cavity_count")
 
    # Calculate Targets
    shift_hours = 12.0
    if details.get("cycle_time") and details.get("running_cavity"):
        shift_hours = get_shift_hours(details.get("shift"))
        details["shift_hours"] = shift_hours
        details["shift_target"] = math.floor((shift_hours * 3600 / flt(details["cycle_time"])) * flt(details["running_cavity"]))
        details["hourly_target"] = math.floor(details["shift_target"] / shift_hours)
    else:
        details["shift_hours"] = 12.0
 
    # Fetch Last Counter from the most recent submitted Log
    m_no = details["machine_no"] or machine_no
    if m_no and mould_code:
        last_log_counter = frappe.db.get_value("Daily Production Log",
            {"mould": mould_code, "machine_no": m_no, "docstatus": 1},
            "last_counter", order_by="creation desc")
        if last_log_counter:
            details["first_counter"] = last_log_counter
        elif mould_code:
            # Fallback to mould's current usage count
            details["first_counter"] = frappe.db.get_value("Mould", mould_code, "current_usage_count")
 
    return details