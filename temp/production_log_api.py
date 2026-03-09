# import frappe
# from frappe import _
# from frappe.utils import nowdate, flt, now_datetime, cstr, time_diff
# from datetime import datetime, time
# import math
 
# def get_shift_hours(shift_name):
#     if not shift_name:
#         return 12.0
   
#     shift_type = frappe.db.get_value("Shift Type", shift_name, ["start_time", "end_time"], as_dict=1)
#     if shift_type and shift_type.start_time and shift_type.end_time:
#         diff = time_diff(shift_type.end_time, shift_type.start_time)
#         hours = diff.total_seconds() / 3600
#         if hours < 0: hours += 24 # Handle overnight shift
#         return hours or 12.0
#     return 12.0
 
# @frappe.whitelist()
# def get_job_card_qty_stats(job_card):
#     if not job_card:
#         return {}
   
#     jc = frappe.get_doc("Job Card", job_card)
#     target_qty = flt(jc.get("for_quantity") or jc.get("qty") or jc.get("qty_to_manufacture") or 0)
   
#     produced_qty = frappe.db.sql("""
#         SELECT SUM(total_shots)
#         FROM `tabDaily Production Log`
#         WHERE job_card = %s AND docstatus < 2
#     """, job_card)[0][0] or 0
   
#     return {
#         "target_qty": flt(target_qty),
#         "produced_qty": flt(produced_qty),
#         "remaining_qty": flt(target_qty) - flt(produced_qty)
#     }
 
# @frappe.whitelist()
# def add_production_log_entry(job_card, time_slot, ok_shots, rej_shots, operator=None, rej_code=None, remarks=None,
#                              create_qi=False, qi_template=None, qi_readings=None):
 
#     if not job_card:
#         frappe.throw(_("Job Card is required"))
   
#     jc = frappe.get_doc("Job Card", job_card)
   
#     # Validation: Check Job Card status
#     if jc.status in ["Completed", "Cancelled"]:
#         frappe.throw(_("Cannot add production log for a {0} Job Card.").format(jc.status))
       
#     # Validation: Check Work Order status
#     if jc.work_order:
#         wo_status, wo_docstatus, shift = frappe.db.get_value("Work Order", jc.work_order, ["status", "docstatus", "shift"])
#         if wo_docstatus == 0:
#             frappe.throw(_("Cannot add production log for a Draft Work Order."))
#         if wo_status in ["Completed", "Stopped"]:
#             frappe.throw(_("Cannot add production log for a {0} Work Order.").format(wo_status))
 
#     today = nowdate()
   
#     # Validation: Check against Job Card Qty To Manufacture
#     # Standard Job Card quantity field is for_quantity; qty is used in some custom versions
#     target_qty = flt(jc.get("for_quantity") or jc.get("qty") or jc.get("qty_to_manufacture") or 0)
   
#     if target_qty > 0:
#         # Sum all shots from all Daily Production Logs for this Job Card that are not cancelled
#         # If adding to an existing draft log, its total_shots in DB is still the old total
#         existing_total = frappe.db.sql("""
#             SELECT SUM(total_shots)
#             FROM `tabDaily Production Log`
#             WHERE job_card = %s AND docstatus < 2
#         """, job_card)[0][0] or 0
       
#         new_shots = flt(ok_shots) + flt(rej_shots)
#         total_forecast = flt(existing_total) + new_shots
 
#         if total_forecast > target_qty:
#             frappe.throw(_("Cannot add production log. Total shots ({0}) would exceed Job Card Qty To Manufacture ({1})").format(
#                 flt(total_forecast), flt(target_qty)
#             ))
   
#     # Resilience: Check for mold vs mould field names
#     dpl_meta = frappe.get_meta("Daily Production Log")
#     mould_field = "mould" if dpl_meta.has_field("mould") else "mold"
   
#     # Try to find an existing Daily Production Log for this Job Card
#     log_name = frappe.db.get_value("Daily Production Log", {
#         "job_card": job_card,
#         "docstatus": 0
#     }, "name")
   
#     if log_name:
#         dpl = frappe.get_doc("Daily Production Log", log_name)
#     else:
#         # Create new Daily Production Log
#         dpl = frappe.new_doc("Daily Production Log")
#         dpl.job_card = job_card
#         dpl.work_order = jc.work_order
#         dpl.doc_no = job_card
#         dpl.company = jc.company
#         dpl.item_code = jc.production_item
#         dpl.report_date = today
#         dpl.machine_no = jc.workstation
#         dpl.operator = operator or jc.get("operator")
#         if not dpl.operator and jc.get("employee"):
#             emp = jc.get("employee")
#             if isinstance(emp, list) and len(emp) > 0:
#                 dpl.operator = emp[0].get("employee")
#             elif hasattr(emp, "__iter__") and not isinstance(emp, (str, dict)):
#                 emp_list = list(emp)
#                 if emp_list:
#                     dpl.operator = emp_list[0].get("employee")
#             else:
#                 dpl.operator = emp
       
#         if dpl.operator and isinstance(dpl.operator, str):
#             dpl.operator_name = frappe.db.get_value("Employee", dpl.operator, "employee_name")
           
#         mould_val = jc.get("mould") or jc.get("mold")
#         dpl.set(mould_field, mould_val)
       
#         # Fetch Quality Inspection if exists for this Job Card
#         qi = frappe.db.get_value("Quality Inspection", {"reference_name": job_card, "docstatus": ["<", 2]}, "name")
#         if qi:
#             dpl.shift = jc.get("custom_shift")
       
#         # Fetch Item details
#         item = frappe.get_doc("Item", jc.production_item)
#         dpl.product_name = item.item_name
#         dpl.shot_weight = item.get("shot_wt")
#         dpl.runner_weight = item.get("runner_wt")
#         dpl.cycle_time = item.get("cycle_time")
#         dpl.shift_target = item.get("shift_prod")
#         dpl.rev_no = item.get("rev_no")
#         dpl.page_no = item.get("page_no")
#         dpl.anti_static = item.get("anti_static")
       
#         # Calculate Targets
#         shift_hours = get_shift_hours(dpl.shift)
#         if dpl.cycle_time and dpl.running_cavity:
#             dpl.shift_hours = shift_hours
#             dpl.shift_target = math.floor((shift_hours * 3600 / flt(dpl.cycle_time)) * flt(dpl.running_cavity))
#             dpl.hourly_target = math.floor(dpl.shift_target / shift_hours)
#         else:
#             dpl.shift_hours = 12.0
       
#         # Fetch Mould details
#         if mould_val:
#             mould_doc = frappe.get_doc("Mould", mould_val)
#             dpl.total_cavity = mould_doc.get("cavity_count")
#             dpl.running_cavity = mould_doc.get("cavity_count")
#             if not dpl.shot_weight: dpl.shot_weight = mould_doc.get("shot_weight")
#             if not dpl.runner_weight: dpl.runner_weight = mould_doc.get("runner_weight")
           
#         # Raw Material and Masterbatch fallback mapping
#         dpl.raw_material = item.get("raw_material")
#         dpl.masterbatch = item.get("masterbatch")
       
#         # Try to fetch raw materials from Job Card items if missing or to get batches
#         if jc.items:
#             for rm_row in jc.items:
#                 i_name = (rm_row.item_name or frappe.db.get_value("Item", rm_row.item_code, "item_name") or "").upper()
#                 if "MASTERBATCH" in i_name:
#                     if not dpl.masterbatch:
#                         dpl.masterbatch = rm_row.item_code
#                     if rm_row.item_code == dpl.masterbatch:
#                         dpl.masterbatch_batch_no = rm_row.batch_no
#                 else:
#                     if not dpl.raw_material:
#                         dpl.raw_material = rm_row.item_code
#                     if rm_row.item_code == dpl.raw_material:
#                         dpl.raw_material_batch_no = rm_row.batch_no
 
#         if dpl.raw_material:
#             dpl.raw_material_grade = frappe.db.get_value("Item", dpl.raw_material, "item_name")
#         if dpl.masterbatch:
#             dpl.masterbatch_grade = frappe.db.get_value("Item", dpl.masterbatch, "item_name")
       
#         # Fetch Batch from Job Card main if available
#         dpl.raw_material_batch_no = jc.get("batch_no")
#         dpl.shift = shift or jc.get("custom_shift")
       
#         # Fetch First Counter from Last Log
#         # Use try-except because even if meta has 'mould', the DB column might be missing until migration
#         try:
#             last_log = frappe.get_all("Daily Production Log",
#                 filters={mould_field: mould_val, "machine_no": dpl.machine_no},
#                 order_by="creation desc", limit=1)
#             if last_log:
#                 dpl.first_counter = frappe.db.get_value("Daily Production Log", last_log[0].name, "last_counter")
#         except Exception:
#             # Fallback to 'mold' if 'mould' fails, or vice versa
#             alt_field = "mold" if mould_field == "mould" else "mould"
#             try:
#                 last_log = frappe.get_all("Daily Production Log",
#                     filters={alt_field: mould_val, "machine_no": dpl.machine_no},
#                     order_by="creation desc", limit=1)
#                 if last_log:
#                     dpl.first_counter = frappe.db.get_value("Daily Production Log", last_log[0].name, "last_counter")
#             except Exception:
#                 pass # Give up on fetching first counter if both fail
 
#         dpl.insert()
   
#     # Add entry to child table
#     prev_total = 0
#     if dpl.production_data:
#         prev_total = flt(dpl.production_data[-1].total_shots)
   
#     current_total = prev_total + flt(ok_shots) + flt(rej_shots)
   
#     dpl.append("production_data", {
#         "time_slot": time_slot,
#         "ok_shots": flt(ok_shots),
#         "rej_shots": flt(rej_shots),
#         "total_shots": current_total,
#         "rej_code": rej_code,
#         "remarks": remarks
#     })
   
#     row = dpl.production_data[-1]
   
#     # Set shift if missing
#     if not dpl.shift:
#         dpl.shift = get_current_shift()
 
#     # Update totals
#     update_totals(dpl)
#     dpl.save()
 
#     # Update Job Card total_completed_qty and process_loss_qty (Cumulative from all logs)
#     all_logs = frappe.get_all(
#         "Daily Production Log",
#         filters={"job_card": job_card, "docstatus": ["<", 2]},
#         fields=["total_ok_shots", "total_rej_shots", "name"],
#     )
 
#     total_ok_sum = 0
#     total_rej_sum = 0
#     for log in all_logs:
#         if log.name == dpl.name:
#             total_ok_sum += flt(dpl.total_ok_shots)
#             total_rej_sum += flt(dpl.total_rej_shots)
#         else:
#             total_ok_sum += flt(log.total_ok_shots)
#             total_rej_sum += flt(log.total_rej_shots)
 
#     # Fallback: If sum is zero but shots were provided, increment current quantities
#     if total_ok_sum == 0 and flt(ok_shots) > 0:
#         total_ok_sum = flt(jc.total_completed_qty) + flt(ok_shots)
#     if total_rej_sum == 0 and flt(rej_shots) > 0:
#         total_rej_sum = flt(jc.process_loss_qty) + flt(rej_shots)
 
#     # Cap process_loss_qty to avoid overproduction error if target exists
#     target_qty = flt(jc.get("for_quantity") or jc.get("qty") or jc.get("qty_to_manufacture") or 0)
#     adjusted_rej_sum = total_rej_sum
#     if target_qty > 0 and (total_ok_sum + total_rej_sum) > target_qty:
#         adjusted_rej_sum = max(0, target_qty - total_ok_sum)
 
#     jc.db_set("total_completed_qty", total_ok_sum)
#     jc.db_set("process_loss_qty", adjusted_rej_sum)
 
#     # Final confirmation message
#     frappe.msgprint(
#         _("Job Card {0}: Total Completed Quantity updated to {1}").format(
#             cstr(job_card), cstr(total_ok_sum)
#         )
#     )
 
#     if create_qi and qi_readings:
#         try:
#             # Re-fetch Job Card for fresh template info
#             jc = frappe.get_doc("Job Card", job_card)
#             item_code = jc.production_item
#             template = qi_template or frappe.db.get_value("Item", item_code, ["in_process_inspection_template", "quality_inspection_template"], as_dict=True)
#             if isinstance(template, dict):
#                 template = template.in_process_inspection_template or template.quality_inspection_template
           
#             qi = frappe.new_doc("Quality Inspection")
#             qi.report_date = today
#             qi.time_slot = time_slot
#             qi.inspected_by = frappe.session.user
#             qi.status = "Accepted"
#             qi.inspection_type = "In Process"
#             qi.company = dpl.company
#             qi.sample_size = 1
#             qi.item_code = item_code
#             qi.reference_type = "Job Card"
#             qi.reference_name = job_card
#             qi.batch_no = str(jc.batch_no) if jc.batch_no else None
#             qi.work_order = str(jc.work_order) if jc.work_order else None
           
#             if template:
#                 qi.quality_inspection_template = template
 
#             # Set machine and mold if fields exist in QI
#             qi_meta = frappe.get_meta("Quality Inspection")
#             if qi_meta.has_field("machine_no"):
#                 qi.machine_no = dpl.machine_no
#             if qi_meta.has_field(mould_field):
#                 qi.set(mould_field, dpl.get(mould_field))
#             elif mould_field == "mould" and qi_meta.has_field("mold"):
#                 qi.mold = dpl.mould
#             elif mould_field == "mold" and qi_meta.has_field("mould"):
#                 qi.mould = dpl.mold
 
#             # Map provided readings for easy lookup
#             if isinstance(qi_readings, str):
#                 qi_readings = frappe.parse_json(qi_readings)
           
#             # Key by specification for matching with template
#             readings_map = {str(r.get("specification")): r for r in qi_readings if r.get("specification")}
 
#             # Fetch parameters from Template to ensure sequence and correct types
#             if template:
#                 params = frappe.get_all("Item Quality Inspection Parameter",
#                     filters={"parent": template},
#                     fields=["specification", "numeric", "parameter_group", "min_value", "max_value", "value", "sample_type", "sample_qty"],
#                     order_by="idx"
#                 )
               
#                 for p in params:
#                     spec = str(p.specification)
#                     r = readings_map.get(spec) or {}
#                     val = r.get("reading_value")
#                     is_p_numeric = p.numeric
#                     min_val = flt(p.min_value) if is_p_numeric and p.min_value is not None else None
#                     max_val = flt(p.max_value) if is_p_numeric and p.max_value is not None else None
                   
#                     reading_row = {
#                         "specification": spec,
#                         "status": "Accepted", # Default, will be recalculated
#                         "numeric": 1 if is_p_numeric else 0,
#                         "min_value": p.min_value,
#                         "max_value": p.max_value,
#                         "value": p.value,
#                         "parameter_group": p.parameter_group,
#                         "sample_type": r.get("sample_type") or p.sample_type,
#                         "sample_qty": flt(r.get("sample_qty")) or flt(p.sample_qty)
#                     }
 
#                     # Determine if value is numeric
#                     is_val_numeric = False
#                     if val is not None and val != "":
#                         try:
#                             float(val)
#                             is_val_numeric = True
#                         except (ValueError, TypeError):
#                             is_val_numeric = False
 
#                     if is_p_numeric:
#                         # Numeric template -> store in reading_1, keep reading_value empty
#                         reading_row["reading_1"] = cstr(val) if val is not None else ""
#                         reading_row["reading_value"] = ""
                       
#                         if is_val_numeric:
#                             f_val = flt(val)
#                             # Automate status check
#                             if (min_val is not None and f_val < min_val) or (max_val is not None and f_val > max_val):
#                                 reading_row["status"] = "Rejected"
#                             else:
#                                 reading_row["status"] = "Accepted"
#                     else:
#                         # Non-numeric template -> store in reading_value, keep reading_1 empty
#                         reading_row["reading_value"] = cstr(val) if val is not None else ""
#                         reading_row["reading_1"] = ""
#                         # For non-numeric or mismatch, keep user status if provided
#                         if r.get("status"):
#                             reading_row["status"] = r.get("status")
 
#                     if reading_row["status"] == "Rejected":
#                         qi.status = "Rejected"
 
#                     qi.append("readings", reading_row)
#             else:
#                 # Fallback to provided readings if no template (unlikely)
#                 for r in qi_readings:
#                     spec = r.get("specification")
#                     if not spec: continue
#                     is_p_numeric = 1 if r.get("numeric") or r.get("is_numeric") else 0
#                     val = r.get("reading_value")
                   
#                     reading_row = {
#                         "specification": str(spec),
#                         "status": str(r.get("status") or "Accepted"),
#                         "numeric": is_p_numeric,
#                         "sample_type": r.get("sample_type"),
#                         "sample_qty": flt(r.get("sample_qty"))
#                     }
                   
#                     if is_p_numeric:
#                         reading_row["reading_1"] = cstr(val) if val is not None else ""
#                         reading_row["reading_value"] = ""
#                     else:
#                         reading_row["reading_value"] = cstr(val) if val is not None else ""
#                         reading_row["reading_1"] = ""
#                     if reading_row["status"] == "Rejected":
#                         qi.status = "Rejected"
#                     qi.append("readings", reading_row)
 
#             try:
#                 # Re-check status: if any row is rejected, document status should be Rejected
#                 qi.insert()
#                 qi.submit()
#             except Exception as e:
#                 frappe.log_error(frappe.get_traceback(), "QI Insertion Error Traceback")
#                 raise e
 
#             # Link QI to the specific row in Production Shots Table
#             row.quality_inspection = qi.name
#             dpl.save()
           
#             frappe.msgprint(_("Quality Inspection {0} created and linked. Status: {1}").format(cstr(qi.name), cstr(qi.status)))
 
#         except Exception as e:
#             frappe.log_error(frappe.get_traceback(), "Production Log QI Error")
#             frappe.msgprint(_("Warning: Production Log added, but failed to create Quality Inspection. Check Error Log: {0}").format(str(e)))
 
#     return dpl.name
 
# def get_current_shift():
#     now = now_datetime().time()
#     shifts = frappe.get_all("Shift Type", fields=["name", "start_time", "end_time"])
   
#     for s in shifts:
#         if s.start_time and s.end_time:
#             # Handle standard shifts and overnight shifts
#             start = (datetime.min + s.start_time).time()
#             end = (datetime.min + s.end_time).time()
           
#             if start <= end:
#                 if start <= now <= end:
#                     return s.name
#             else: # Overnight shift
#                 if now >= start or now <= end:
#                     return s.name
#     return None
 
# def update_totals(dpl):
#     total_ok = 0
#     total_rej = 0
#     for row in dpl.production_data:
#         total_ok += flt(row.ok_shots)
#         total_rej += flt(row.rej_shots)
   
#     dpl.total_ok_shots = total_ok
#     dpl.total_rej_shots = total_rej
#     dpl.total_shots = total_ok + total_rej
   
#     # Update last_counter
#     dpl.last_counter = flt(dpl.first_counter or 0) + total_ok + total_rej
   
#     # RM Consumption calculation (grams to kg)
#     if dpl.get("shot_weight") or dpl.get("runner_weight"):
#         s_wt = flt(dpl.get("shot_weight"))
#         r_wt = flt(dpl.get("runner_weight"))
#         dpl.rm_consumption = (s_wt + r_wt) * (total_ok + total_rej) / 1000
 
# @frappe.whitelist()
# def get_job_cards_for_work_order(work_order):
#     return frappe.get_all("Job Card",
#         filters={
#             "work_order": work_order,
#             "docstatus": ["<", 2],
#             "status": ["in", ["Open", "Work In Progress"]]
#         },
#         fields=["name", "operation", "workstation"]
#     )
 
# @frappe.whitelist()
# def get_last_time_slot(job_card):
#     # Find the most recent Daily Production Log for this Job Card
#     last_log = frappe.db.get_value("Daily Production Log",
#         {"job_card": job_card, "docstatus": ["<", 2]},
#         "name",
#         order_by="report_date desc, creation desc"
#     )
   
#     if last_log:
#         # Get the last time slot from the production_data child table
#         last_slot = frappe.db.get_value("Production Shots Table",
#             {"parent": last_log},
#             "time_slot",
#             order_by="idx desc"
#         )
#         return last_slot
   
#     return None
 
# @frappe.whitelist()
# def get_production_log_defaults(job_card):
#     if not job_card:
#         return {}
   
#     # Get standard details (targets, RM, MB, batches, etc.)
#     from mold_management.mold_management.doctype.daily_production_log.daily_production_log import get_job_card_details
#     details = get_job_card_details(job_card)
   
#     # Get next time slot
#     last_slot = get_last_time_slot(job_card)
#     next_slot = None
   
#     slots = frappe.get_all("Production Time Slots", fields=["name"], order_by="idx")
#     if slots:
#         if last_slot:
#             try:
#                 current_idx = next(i for i, s in enumerate(slots) if s.name == last_slot)
#                 if current_idx < len(slots) - 1:
#                     next_slot = slots[current_idx + 1].name
#                 else:
#                     next_slot = slots[0].name # Wrap around
#             except StopIteration:
#                 next_slot = slots[0].name
#         else:
#             next_slot = slots[0].name
 
#     defaults = {
#         "next_time_slot": next_slot,
#         "last_time_slot": last_slot
#     }
#     defaults.update(details)
#     return defaults
 
# @frappe.whitelist()
# def get_production_logs(limit=50, name=None):
#     filters = {}
#     if name:
#         filters["name"] = name
       
#     logs = frappe.get_all("Daily Production Log", filters=filters, fields=["*"], order_by="creation desc", limit=limit)
#     for log in logs:
#         log["production_data"] = frappe.get_all("Production Shots Table",
#             filters={"parent": log.name},
#             fields=["*"],
#             order_by="idx")
#     return logs
 
# @frappe.whitelist()
# def get_qi_template_parameters(job_card=None, template=None):
#     if not template and job_card:
#         item_code = frappe.db.get_value("Job Card", job_card, "production_item")
#         if item_code:
#             res = frappe.db.get_value("Item", item_code, ["in_process_inspection_template", "quality_inspection_template"], as_dict=True)
#             if res:
#                 template = res.in_process_inspection_template or res.quality_inspection_template
   
#     if not template:
#         return []
 
#     return frappe.get_all("Item Quality Inspection Parameter",
#         filters={"parent": template},
#         fields=["*"],
#         order_by="idx") # Maintain sequence as per template
 
# @frappe.whitelist()
# def get_item_qi_details(job_card):
#     item_code = frappe.db.get_value("Job Card", job_card, "production_item")
#     if not item_code:
#         return {}
   
#     res = frappe.db.get_value("Item", item_code, ["in_process_inspection_template", "quality_inspection_template"], as_dict=True)
#     template = None
#     if res:
#         template = res.in_process_inspection_template or res.quality_inspection_template
   
#     if not template:
#         return {}
       
#     parameters = get_qi_template_parameters(template=template)
#     return {
#         "template": template,
#         "parameters": parameters
#     }

import frappe
from frappe import _
from frappe.utils import nowdate, flt, now_datetime, cstr, time_diff
from datetime import datetime, time
import math
 
def format_link_param(val):
    if val is None or val == "": return None
    if isinstance(val, str) and not ('.' in val and val.replace('.', '', 1).isdigit()):
        return str(val)
    try:
        f_val = float(val)
        if f_val == int(f_val):
            return str(int(f_val))
        return str(f_val)
    except (ValueError, TypeError):
        return str(val)
 
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
def get_job_card_qty_stats(job_card):
    if not job_card:
        return {}
   
    jc = frappe.get_doc("Job Card", job_card)
    target_qty = flt(jc.get("for_quantity") or jc.get("qty") or jc.get("qty_to_manufacture") or 0)
   
    produced_qty = frappe.db.sql("""
        SELECT SUM(total_ok_shots)
        FROM `tabDaily Production Log`
        WHERE job_card = %s AND docstatus < 2
    """, job_card)[0][0] or 0
    
    rejected_qty = frappe.db.sql("""
        SELECT SUM(total_rej_shots)
        FROM `tabDaily Production Log`
        WHERE job_card = %s AND docstatus < 2
    """, job_card)[0][0] or 0
    
    return {
        "target_qty": flt(target_qty),
        "produced_qty": flt(produced_qty),
        "rejected_qty": flt(rejected_qty),
        "remaining_qty": flt(target_qty) - flt(produced_qty)
    }

@frappe.whitelist()
def get_work_order_rejection_stats(work_order):
    if not work_order:
        return {"total_rej_shots": 0, "total_ok_shots": 0}
    
    # Sum totals from all Daily Production Logs linked to this Work Order
    stats = frappe.db.sql("""
        SELECT SUM(total_ok_shots), SUM(total_rej_shots)
        FROM `tabDaily Production Log`
        WHERE work_order = %s AND docstatus < 2
    """, work_order)[0]
    
    return {
        "total_ok_shots": flt(stats[0] or 0),
        "total_rej_shots": flt(stats[1] or 0)
    }
 
@frappe.whitelist()
def add_production_log_entry(job_card, time_slot, ok_shots, rej_shots, operator=None, rej_code=None, remarks=None,
                             create_qi=False, qi_template=None, qi_readings=None):
 
    if not job_card:
        frappe.throw(_("Job Card is required"))
   
    jc = frappe.get_doc("Job Card", job_card)
   
    # Validation: Check Job Card status
    if jc.status in ["Completed", "Cancelled"]:
        frappe.throw(_("Cannot add production log for a {0} Job Card.").format(jc.status))
       
    # Validation: Check Work Order status
    if jc.work_order:
        wo_status, wo_docstatus, shift = frappe.db.get_value("Work Order", jc.work_order, ["status", "docstatus", "shift"])
        if wo_docstatus == 0:
            frappe.throw(_("Cannot add production log for a Draft Work Order."))
        if wo_status in ["Completed", "Stopped"]:
            frappe.throw(_("Cannot add production log for a {0} Work Order.").format(wo_status))
 
    today = nowdate()
   
    # Validation: Check against Job Card Qty To Manufacture
    # Standard Job Card quantity field is for_quantity; qty is used in some custom versions
    target_qty = flt(jc.get("for_quantity") or jc.get("qty") or jc.get("qty_to_manufacture") or 0)
   
    if target_qty > 0:
        # Sum all shots from all Daily Production Logs for this Job Card that are not cancelled
        # If adding to an existing draft log, its total_shots in DB is still the old total
        existing_total = frappe.db.sql("""
            SELECT SUM(total_shots)
            FROM `tabDaily Production Log`
            WHERE job_card = %s AND docstatus < 2
        """, job_card)[0][0] or 0
       
        new_shots = flt(ok_shots) + flt(rej_shots)
        total_forecast = flt(existing_total) + new_shots
 
        if total_forecast > target_qty:
            frappe.throw(_("Cannot add production log. Total shots ({0}) would exceed Job Card Qty To Manufacture ({1})").format(
                flt(total_forecast), flt(target_qty)
            ))
   
    # Resilience: Check for mold vs mould field names
    dpl_meta = frappe.get_meta("Daily Production Log")
    mould_field = "mould" if dpl_meta.has_field("mould") else "mold"
   
    # Try to find an existing Daily Production Log for this Job Card
    log_name = frappe.db.get_value("Daily Production Log", {
        "job_card": job_card,
        "docstatus": 0
    }, "name")
   
    if log_name:
        dpl = frappe.get_doc("Daily Production Log", log_name)
    else:
        # Create new Daily Production Log
        dpl = frappe.new_doc("Daily Production Log")
        dpl.job_card = job_card
        dpl.work_order = jc.work_order
        dpl.doc_no = job_card
        dpl.company = jc.company
        dpl.item_code = jc.production_item
        dpl.report_date = today
        dpl.machine_no = jc.workstation
        dpl.operator = operator or jc.get("operator")
        if not dpl.operator and jc.get("employee"):
            emp = jc.get("employee")
            if isinstance(emp, list) and len(emp) > 0:
                dpl.operator = emp[0].get("employee")
            elif hasattr(emp, "__iter__") and not isinstance(emp, (str, dict)):
                emp_list = list(emp)
                if emp_list:
                    dpl.operator = emp_list[0].get("employee")
            else:
                dpl.operator = emp
       
        if dpl.operator and isinstance(dpl.operator, str):
            dpl.operator_name = frappe.db.get_value("Employee", dpl.operator, "employee_name")
           
        mould_val = jc.get("mould") or jc.get("mold")
        dpl.set(mould_field, mould_val)
       
        # Fetch Quality Inspection if exists for this Job Card
        qi = frappe.db.get_value("Quality Inspection", {"reference_name": job_card, "docstatus": ["<", 2]}, "name")
        if qi:
            dpl.shift = jc.get("custom_shift")
       
        # Fetch Item details
        item = frappe.get_doc("Item", jc.production_item)
        dpl.product_name = item.item_name
        dpl.shot_weight = item.get("shot_wt")
        dpl.runner_weight = item.get("runner_wt")
        dpl.cycle_time = item.get("cycle_time")
        dpl.shift_target = item.get("shift_prod")
        dpl.rev_no = item.get("rev_no")
        dpl.page_no = item.get("page_no")
        dpl.anti_static = item.get("anti_static")
       
        # Calculate Targets
        shift_hours = get_shift_hours(dpl.shift)
        if dpl.cycle_time and dpl.running_cavity:
            dpl.shift_hours = shift_hours
            dpl.shift_target = math.floor((shift_hours * 3600 / flt(dpl.cycle_time)) * flt(dpl.running_cavity))
            dpl.hourly_target = math.floor(dpl.shift_target / shift_hours)
        else:
            dpl.shift_hours = 12.0
       
        # Fetch Mould details
        if mould_val:
            mould_doc = frappe.get_doc("Mould", mould_val)
            dpl.total_cavity = mould_doc.get("cavity_count")
            dpl.running_cavity = mould_doc.get("cavity_count")
            if not dpl.shot_weight: dpl.shot_weight = mould_doc.get("shot_weight")
            if not dpl.runner_weight: dpl.runner_weight = mould_doc.get("runner_weight")
           
        # Prioritize Masterbatches from Job Card items
        found_mb = False
        if jc.items:
            for rm_row in jc.items:
                i_name = (rm_row.item_name or frappe.db.get_value("Item", rm_row.item_code, "item_name") or "").upper()
                if "MASTERBATCH" in i_name:
                    if not found_mb:
                        dpl.masterbatch = format_link_param(rm_row.item_code)
                        found_mb = True
                    if rm_row.item_code == dpl.masterbatch:
                        dpl.masterbatch_batch_no = format_link_param(rm_row.batch_no)

        # Fallback to Item master only for masterbatch if not found in Job Card
        if not found_mb:
            mb_val = item.get("masterbatch")
            if mb_val:
                dpl.masterbatch = format_link_param(mb_val)
 
        if dpl.masterbatch:
            dpl.masterbatch_grade = frappe.db.get_value("Item", dpl.masterbatch, "item_name")
       
        # Fetch Batch from Job Card main if available
        dpl.shift = format_link_param(shift or jc.get("custom_shift"))
       
        # Fetch First Counter from Last Log
        # Use try-except because even if meta has 'mould', the DB column might be missing until migration
        try:
            last_log = frappe.get_all("Daily Production Log",
                filters={mould_field: mould_val, "machine_no": dpl.machine_no},
                order_by="creation desc", limit=1)
            if last_log:
                dpl.first_counter = frappe.db.get_value("Daily Production Log", last_log[0].name, "last_counter")
        except Exception:
            # Fallback to 'mold' if 'mould' fails, or vice versa
            alt_field = "mold" if mould_field == "mould" else "mould"
            try:
                last_log = frappe.get_all("Daily Production Log",
                    filters={alt_field: mould_val, "machine_no": dpl.machine_no},
                    order_by="creation desc", limit=1)
                if last_log:
                    dpl.first_counter = frappe.db.get_value("Daily Production Log", last_log[0].name, "last_counter")
            except Exception:
                pass # Give up on fetching first counter if both fail

        # Normalize Link fields before save/insert to avoid AssertionError (like raw_material: 1000.0)
        link_fields = ["raw_material", "masterbatch", "raw_material_batch_no", "masterbatch_batch_no", "job_card", "work_order", "mould", "mold", "machine_no", "operator", "shift", "item_code"]
        for field in link_fields:
            if dpl.get(field):
                dpl.set(field, format_link_param(dpl.get(field)))

        dpl.insert()
   
    # Add entry to child table
    prev_total = 0
    if dpl.production_data:
        prev_total = flt(dpl.production_data[-1].total_shots)
   
    current_total = prev_total + flt(ok_shots) + flt(rej_shots)
   
    dpl.append("production_data", {
        "time_slot": time_slot,
        "ok_shots": flt(ok_shots),
        "rej_shots": flt(rej_shots),
        "total_shots": current_total,
        "rej_code": rej_code,
        "remarks": remarks
    })
   
    row = dpl.production_data[-1]
   
    # Set shift if missing
    if not dpl.shift:
        dpl.shift = get_current_shift()
 
    # Update totals
    update_totals(dpl)
    
    # Normalize Link fields before save/insert
    link_fields = ["raw_material", "masterbatch", "raw_material_batch_no", "masterbatch_batch_no", "job_card", "work_order", "mould", "mold", "machine_no", "operator", "shift", "item_code"]
    for field in link_fields:
        if dpl.get(field):
            dpl.set(field, format_link_param(dpl.get(field)))

    dpl.save()
 
    # Update Job Card total_completed_qty and process_loss_qty (Cumulative from all logs)
    all_logs = frappe.get_all(
        "Daily Production Log",
        filters={"job_card": job_card, "docstatus": ["<", 2]},
        fields=["total_ok_shots", "total_rej_shots", "name"],
    )
 
    total_ok_sum = 0
    total_rej_sum = 0
    for log in all_logs:
        if log.name == dpl.name:
            total_ok_sum += flt(dpl.total_ok_shots)
            total_rej_sum += flt(dpl.total_rej_shots)
        else:
            total_ok_sum += flt(log.total_ok_shots)
            total_rej_sum += flt(log.total_rej_shots)
 
    # Fallback: If sum is zero but shots were provided, increment current quantities
    if total_ok_sum == 0 and flt(ok_shots) > 0:
        total_ok_sum = flt(jc.total_completed_qty) + flt(ok_shots)
    if total_rej_sum == 0 and flt(rej_shots) > 0:
        total_rej_sum = flt(jc.process_loss_qty) + flt(rej_shots)
 
    # Cap process_loss_qty to avoid overproduction error if target exists
    target_qty = flt(jc.get("for_quantity") or jc.get("qty") or jc.get("qty_to_manufacture") or 0)
    adjusted_rej_sum = total_rej_sum
    if target_qty > 0 and (total_ok_sum + total_rej_sum) > target_qty:
        adjusted_rej_sum = max(0, target_qty - total_ok_sum)
 
    # Sync these to the Job Card so they are visible immediately
    # We use db_set to avoid triggering full validation/submission logic here
    # but still make the values "real" for the next reload
    try:
        jc.db_set("total_completed_qty", total_ok_sum)
        jc.db_set("process_loss_qty", adjusted_rej_sum)
        
        # Also update status if target is met? (Optional, but helps UX)
        if target_qty > 0 and total_ok_sum >= target_qty:
            jc.db_set("status", "Work In Progress") # Ensure it's not "Open"
    except Exception as e:
        frappe.log_error(f"Error syncing stats to Job Card {job_card}: {str(e)}")

    # Final confirmation message
    frappe.msgprint(
        _("Job Card {0}: Total Completed Quantity updated to {1}").format(
            job_card, total_ok_sum
        )
    )
 
    if create_qi and qi_readings:
        try:
            # Re-fetch Job Card for fresh template info
            jc = frappe.get_doc("Job Card", job_card)
            item_code = jc.production_item
            template = qi_template or frappe.db.get_value("Item", item_code, ["in_process_inspection_template", "quality_inspection_template"], as_dict=True)
            if isinstance(template, dict):
                template = template.in_process_inspection_template or template.quality_inspection_template
           
            qi = frappe.new_doc("Quality Inspection")
            qi.report_date = today
            qi.time_slot = time_slot
            qi.inspected_by = frappe.session.user
            qi.status = "Accepted"
            qi.inspection_type = "In Process"
            qi.company = dpl.company
            qi.sample_size = 1
            qi.item_code = item_code
            qi.reference_type = "Job Card"
            qi.reference_name = job_card
            qi.batch_no = str(jc.batch_no) if jc.batch_no else None
            qi.work_order = str(jc.work_order) if jc.work_order else None
           
            if template:
                qi.quality_inspection_template = template
 
            # Set machine and mold if fields exist in QI
            qi_meta = frappe.get_meta("Quality Inspection")
            if qi_meta.has_field("machine_no"):
                qi.machine_no = dpl.machine_no
            if qi_meta.has_field(mould_field):
                qi.set(mould_field, dpl.get(mould_field))
            elif mould_field == "mould" and qi_meta.has_field("mold"):
                qi.mold = dpl.mould
            elif mould_field == "mold" and qi_meta.has_field("mould"):
                qi.mould = dpl.mold
 
            # Map provided readings for easy lookup
            if isinstance(qi_readings, str):
                qi_readings = frappe.parse_json(qi_readings)
           
            # Key by specification for matching with template
            readings_map = {str(r.get("specification")): r for r in qi_readings if r.get("specification")}
 
            # Fetch parameters from Template to ensure sequence and correct types
            if template:
                params = frappe.get_all("Item Quality Inspection Parameter",
                    filters={"parent": template},
                    fields=["specification", "numeric", "parameter_group", "min_value", "max_value", "value", "sample_type", "sample_qty"],
                    order_by="idx"
                )
               
                for p in params:
                    spec = str(p.specification)
                    r = readings_map.get(spec) or {}
                    val = r.get("reading_value")
                    is_p_numeric = p.numeric
                    min_val = flt(p.min_value) if is_p_numeric and p.min_value is not None else None
                    max_val = flt(p.max_value) if is_p_numeric and p.max_value is not None else None
                   
                    reading_row = {
                        "specification": spec,
                        "status": "Accepted", # Default, will be recalculated
                        "numeric": 1 if is_p_numeric else 0,
                        "min_value": p.min_value,
                        "max_value": p.max_value,
                        "value": p.value,
                        "parameter_group": p.parameter_group,
                        "sample_type": r.get("sample_type") or p.sample_type,
                        "sample_qty": flt(r.get("sample_qty")) or flt(p.sample_qty)
                    }
 
                    # Determine if value is numeric
                    is_val_numeric = False
                    if val is not None and val != "":
                        try:
                            float(val)
                            is_val_numeric = True
                        except (ValueError, TypeError):
                            is_val_numeric = False
 
                    if is_p_numeric:
                        # Numeric template -> store in reading_1, keep reading_value empty
                        reading_row["reading_1"] = cstr(val) if val is not None else ""
                        reading_row["reading_value"] = ""
                       
                        if is_val_numeric:
                            f_val = flt(val)
                            # Automate status check
                            if (min_val is not None and f_val < min_val) or (max_val is not None and f_val > max_val):
                                reading_row["status"] = "Rejected"
                            else:
                                reading_row["status"] = "Accepted"
                    else:
                        # Non-numeric template -> store in reading_value, keep reading_1 empty
                        reading_row["reading_value"] = cstr(val) if val is not None else ""
                        reading_row["reading_1"] = ""
                        # For non-numeric or mismatch, keep user status if provided
                        if r.get("status"):
                            reading_row["status"] = r.get("status")
 
                    if reading_row["status"] == "Rejected":
                        qi.status = "Rejected"
 
                    qi.append("readings", reading_row)
            else:
                # Fallback to provided readings if no template (unlikely)
                for r in qi_readings:
                    spec = r.get("specification")
                    if not spec: continue
                    is_p_numeric = 1 if r.get("numeric") or r.get("is_numeric") else 0
                    val = r.get("reading_value")
                   
                    reading_row = {
                        "specification": str(spec),
                        "status": str(r.get("status") or "Accepted"),
                        "numeric": is_p_numeric,
                        "sample_type": r.get("sample_type"),
                        "sample_qty": flt(r.get("sample_qty"))
                    }
                   
                    if is_p_numeric:
                        reading_row["reading_1"] = cstr(val) if val is not None else ""
                        reading_row["reading_value"] = ""
                    else:
                        reading_row["reading_value"] = cstr(val) if val is not None else ""
                        reading_row["reading_1"] = ""
                    if reading_row["status"] == "Rejected":
                        qi.status = "Rejected"
                    qi.append("readings", reading_row)
 
            try:
                # Re-check status: if any row is rejected, document status should be Rejected
                qi.insert()
                qi.submit()
            except Exception as e:
                frappe.log_error(frappe.get_traceback(), "QI Insertion Error Traceback")
                raise e
 
            # Link QI to the specific row in Production Shots Table
            row.quality_inspection = qi.name
            dpl.save()
           
            frappe.msgprint(_("Quality Inspection {0} created and linked. Status: {1}").format(qi.name, qi.status))
 
        except Exception as e:
            frappe.log_error(frappe.get_traceback(), "Production Log QI Error")
            frappe.msgprint(_("Warning: Production Log added, but failed to create Quality Inspection. Check Error Log: {0}").format(str(e)))
 
    return dpl.name
 
def get_current_shift():
    now = now_datetime().time()
    shifts = frappe.get_all("Shift Type", fields=["name", "start_time", "end_time"])
   
    for s in shifts:
        if s.start_time and s.end_time:
            # Handle standard shifts and overnight shifts
            start = (datetime.min + s.start_time).time()
            end = (datetime.min + s.end_time).time()
           
            if start <= end:
                if start <= now <= end:
                    return s.name
            else: # Overnight shift
                if now >= start or now <= end:
                    return s.name
    return None
 
def update_totals(dpl):
    total_ok = 0
    total_rej = 0
    for row in dpl.production_data:
        total_ok += flt(row.ok_shots)
        total_rej += flt(row.rej_shots)
   
    dpl.total_ok_shots = total_ok
    dpl.total_rej_shots = total_rej
    dpl.total_shots = total_ok + total_rej
   
    # Update last_counter
    dpl.last_counter = flt(dpl.first_counter or 0) + total_ok + total_rej
   
    # RM Consumption calculation (grams to kg)
    if dpl.get("shot_weight") or dpl.get("runner_weight"):
        s_wt = flt(dpl.get("shot_weight"))
        r_wt = flt(dpl.get("runner_weight"))
        dpl.rm_consumption = (s_wt + r_wt) * (total_ok + total_rej) / 1000
 
@frappe.whitelist()
def get_job_cards_for_work_order(work_order):
    return frappe.get_all("Job Card",
        filters={
            "work_order": work_order,
            "docstatus": ["<", 2],
            "status": ["in", ["Open", "Work In Progress"]]
        },
        fields=["name", "operation", "workstation"]
    )
 
@frappe.whitelist()
def get_last_time_slot(job_card):
    # Find the most recent Daily Production Log for this Job Card
    last_log = frappe.db.get_value("Daily Production Log",
        {"job_card": job_card, "docstatus": ["<", 2]},
        "name",
        order_by="report_date desc, creation desc"
    )
   
    if last_log:
        # Get the last time slot from the production_data child table
        last_slot = frappe.db.get_value("Production Shots Table",
            {"parent": last_log},
            "time_slot",
            order_by="idx desc"
        )
        return last_slot
   
    return None
 
@frappe.whitelist()
def get_production_log_defaults(job_card):
    if not job_card:
        return {}
   
    # Get standard details (targets, RM, MB, batches, etc.)
    from mold_management.mold_management.doctype.daily_production_log.daily_production_log import get_job_card_details
    details = get_job_card_details(job_card)
   
    # Get next time slot
    last_slot = get_last_time_slot(job_card)
    next_slot = None
   
    slots = frappe.get_all("Production Time Slots", fields=["name"], order_by="idx")
    if slots:
        if last_slot:
            try:
                current_idx = next(i for i, s in enumerate(slots) if s.name == last_slot)
                if current_idx < len(slots) - 1:
                    next_slot = slots[current_idx + 1].name
                else:
                    next_slot = slots[0].name # Wrap around
            except StopIteration:
                next_slot = slots[0].name
        else:
            next_slot = slots[0].name
 
    defaults = {
        "next_time_slot": next_slot,
        "last_time_slot": last_slot
    }
    defaults.update(details)
    return defaults
 
@frappe.whitelist()
def get_production_logs(limit=50, name=None):
    filters = {}
    if name:
        filters["name"] = name
       
    logs = frappe.get_all("Daily Production Log", filters=filters, fields=["*"], order_by="creation desc", limit=limit)
    for log in logs:
        log["production_data"] = frappe.get_all("Production Shots Table",
            filters={"parent": log.name},
            fields=["*"],
            order_by="idx")
    return logs
 
@frappe.whitelist()
def get_qi_template_parameters(job_card=None, template=None):
    if not template and job_card:
        item_code = frappe.db.get_value("Job Card", job_card, "production_item")
        if item_code:
            res = frappe.db.get_value("Item", item_code, ["in_process_inspection_template", "quality_inspection_template"], as_dict=True)
            if res:
                template = res.in_process_inspection_template or res.quality_inspection_template
   
    if not template:
        return []
 
    return frappe.get_all("Item Quality Inspection Parameter",
        filters={"parent": template},
        fields=["*"],
        order_by="idx") # Maintain sequence as per template
 
@frappe.whitelist()
def get_item_qi_details(job_card):
    item_code = frappe.db.get_value("Job Card", job_card, "production_item")
    if not item_code:
        return {}
   
    res = frappe.db.get_value("Item", item_code, ["in_process_inspection_template", "quality_inspection_template"], as_dict=True)
    template = None
    if res:
        template = res.in_process_inspection_template or res.quality_inspection_template
   
    if not template:
        return {}
       
    parameters = get_qi_template_parameters(template=template)
    return {
        "template": template,
        "parameters": parameters
    }