import frappe
from frappe import _
from frappe.utils import nowdate, flt, now_datetime
from datetime import datetime, time

@frappe.whitelist()
def add_production_log_entry(job_card, time_slot, ok_shots, rej_shots, operator=None, rej_code=None, remarks=None):
    if not job_card:
        frappe.throw(_("Job Card is required"))
    
    jc = frappe.get_doc("Job Card", job_card)
    today = nowdate()
    
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
        # Ensure Quality Inspection is linked if missing
        if not dpl.quality_inspection:
            qi = frappe.db.get_value("Quality Inspection", {"reference_name": job_card, "docstatus": ["<", 2]}, "name")
            if not qi and jc.work_order:
                qi = frappe.db.get_value("Quality Inspection", {"reference_name": jc.work_order, "docstatus": ["<", 2]}, "name")
            if qi:
                dpl.quality_inspection = qi
                dpl.shift = jc.get("custom_shift")
                # Note: dpl.save() is called at the end of the function regardless
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
        dpl.operator = operator or jc.get("operator") or jc.get("employee")
        
        # Handle employee field which could be Table MultiSelect or Link
        if not dpl.operator and hasattr(jc, "employee"):
             dpl.operator = jc.employee[0].employee if isinstance(jc.employee, list) and len(jc.employee) > 0 else jc.employee
        
        if dpl.operator:
            dpl.operator_name = frappe.db.get_value("Employee", dpl.operator, "employee_name")
            
        mould_val = jc.get("mould") or jc.get("mold")
        dpl.set(mould_field, mould_val)
        
        # Fetch Quality Inspection if exists for this Job Card
        qi = frappe.db.get_value("Quality Inspection", {"reference_name": job_card, "docstatus": ["<", 2]}, "name")
        if qi:
            dpl.quality_inspection = qi
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
        
        if dpl.shift_target:
            dpl.hourly_target = flt(dpl.shift_target) / 12  # Assuming 12hr shift
        
        # Fetch Mould details
        if mould_val:
            mould_doc = frappe.get_doc("Mould", mould_val)
            dpl.total_cavity = mould_doc.get("cavity_count")
            dpl.running_cavity = mould_doc.get("cavity_count") 
            if not dpl.shot_weight: dpl.shot_weight = mould_doc.get("shot_weight")
            if not dpl.runner_weight: dpl.runner_weight = mould_doc.get("runner_weight")
            dpl.total_shots = mould_doc.get("total_shots")
            
        # Raw Material and Masterbatch fallback mapping
        dpl.raw_material = item.get("raw_material")
        dpl.raw_material_grade = item.get("raw_material_grade")
        dpl.masterbatch = item.get("masterbatch")
        dpl.masterbatch_grade = item.get("masterbatch_grade")
        
        # Try to fetch raw materials from Job Card items
        if jc.items:
            for rm in jc.items:
                item_name = rm.item_name or frappe.db.get_value("Item", rm.item_code, "item_name")
                if item_name and "MASTERBATCH" in item_name.upper():
                    if not dpl.masterbatch: 
                        dpl.masterbatch = rm.item_code
                        dpl.masterbatch_grade = frappe.db.get_value("Item", rm.item_code, "item_name")
                else:
                    if not dpl.raw_material: 
                        dpl.raw_material = rm.item_code
                        dpl.raw_material_grade = frappe.db.get_value("Item", rm.item_code, "item_name")
        
        # If still no Masterbatch, check linked Items in BOM if needed (skipped for now as per user request to use Job Card RM)
        
        # Enhanced Quality Inspection Fetching
        qi = frappe.db.get_value("Quality Inspection", {"reference_name": job_card, "docstatus": ["<", 2]}, "name")
        if not qi and jc.work_order:
             qi = frappe.db.get_value("Quality Inspection", {"reference_name": jc.work_order, "docstatus": ["<", 2]}, "name")
             
        if qi:
            dpl.quality_inspection = qi
            dpl.shift = jc.get("custom_shift")
        
        # Fetch Batch from Job Card main if available
        dpl.raw_material_batch_no = jc.get("batch_no")
        
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
    
    # Set shift if missing
    if not dpl.shift:
        dpl.shift = get_current_shift()

    # Update totals
    update_totals(dpl)
    dpl.save()
    
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
    return frappe.get_all("Job Card", filters={"work_order": work_order, "docstatus": ["<", 2]}, fields=["name", "operation", "workstation"])

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
