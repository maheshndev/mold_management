import frappe
from frappe import _
from frappe.utils import flt, cint

def validate_quality_inspection(doc, method):
	"""
	Hook for Quality Inspection 'validate' event.
	1. Automates fetching of custom fields from the template.
	2. Implements custom "All Match" rule.
	"""
	if doc.quality_inspection_template:
		fetch_custom_fields_from_template(doc)
	
	calculate_custom_inspection_status(doc)

def fetch_custom_fields_from_template(doc):
	"""
	Fetches all relevant fields (standard and custom) from the template
	and updates the readings table if the values are blank.
	"""
	template = doc.quality_inspection_template
	if not template:
		return

	# Fetch parameters from Template including standard and custom fields
	params = frappe.get_all("Item Quality Inspection Parameter",
		filters={"parent": template},
		fields=["specification", "sample_type", "sample_qty", "criteria_type", "avg", "min_value", "max_value", "value", "numeric"],
		ignore_permissions=True
	)

	if not params:
		return

	# Create a map for easy lookup
	params_map = {p.specification: p for p in params}

	# Update readings
	modified = False
	for row in doc.readings:
		param_data = params_map.get(row.specification)
		if param_data:
			# Update both custom and standard fields if they are blank/None (avoiding overwrite)
			if row.get("sample_type") is None or row.get("sample_type") == "":
				row.sample_type = param_data.sample_type
				modified = True
			if flt(row.get("sample_qty")) == 0:
				row.sample_qty = flt(param_data.sample_qty)
				modified = True
			if row.get("criteria_type") is None or row.get("criteria_type") == "":
				row.criteria_type = param_data.criteria_type
				modified = True
			if row.get("avg") is None or row.get("avg") == "":
				row.avg = param_data.avg
				modified = True
			
			# Ensure standard numeric fields are also populated correctly
			if flt(row.get("min_value")) == 0 and flt(param_data.min_value) != 0:
				row.min_value = flt(param_data.min_value)
				modified = True
			if flt(row.get("max_value")) == 0 and flt(param_data.max_value) != 0:
				row.max_value = flt(param_data.max_value)
				modified = True
			if row.get("value") is None or row.get("value") == "":
				row.value = param_data.value
				modified = True
			if row.get("numeric") is None: # Numeric is a Check (0/1)
				row.numeric = param_data.numeric
				modified = True

	return modified

def calculate_custom_inspection_status(doc):
	"""
	Iterates through readings and applies custom validation:
	- All Match Rule: Pass Count == intended Sample Qty.
	- Strict Field Selection:
	    - Numeric: Reading 1 to N (N=sample_qty).
	    - String: Reading Value (1st) + Reading 1 to N-1.
	- Overwrites doc.status on save.
	"""
	import math

	all_accepted = True
	sample_size = flt(doc.sample_size or 0)
	
	for row in doc.readings:
		row_sample_qty = flt(row.get("sample_qty") or 0)

		is_numeric_param = cint(row.numeric)
		effective_qty = int(row_sample_qty) if row_sample_qty > 0 else 1
		row_accepted = False
		
		# 2. Collect Readings based on strict sequence
		target_readings = []
		
		if is_numeric_param:
			# Numeric Logic: Strictly check Reading 1 to Reading N
			for i in range(1, effective_qty + 1):
				if i > 10: break
				val = row.get(f"reading_{i}")
				if val is not None and str(val).strip():
					target_readings.append(str(val).strip())
			
			# Special Fallback: If sample_qty is 1 and Reading 1 is blank, check Reading Value
			if effective_qty == 1 and not target_readings:
				rv = row.get("reading_value")
				if rv is not None and str(rv).strip():
					target_readings = [str(rv).strip()]
		else:
			# String Logic: Reading Value + Reading 1 to Reading N-1
			rv = row.get("reading_value")
			if rv is not None and str(rv).strip():
				target_readings.append(str(rv).strip())
			
			# Add from Reading 1 onwards until we hit effective_qty
			if len(target_readings) < effective_qty:
				needed = effective_qty - len(target_readings)
				for i in range(1, needed + 1):
					if i > 10: break
					val = row.get(f"reading_{i}")
					if val is not None and str(val).strip():
						target_readings.append(str(val).strip())

		# 3. Validate Collected Readings
		if target_readings:
			pass_count = 0
			min_v = flt(row.get("min_value"))
			max_v = flt(row.get("max_value"))
			target_spec_data = str(row.get("value") or "").strip()

			for raw_val in target_readings:
				is_ok = False
				if is_numeric_param:
					try:
						f_val = float(raw_val)
						# Apply standard range check ALWAYS for numeric majority
						if min_v <= f_val <= max_v:
							is_ok = True
					except:
						is_ok = False
				else:
					# String Comparison (Case-Insensitive)
					if raw_val.lower() == target_spec_data.lower():
						is_ok = True
				
				if is_ok:
					pass_count += 1
			
			# All Match Rule (Require strictly all of effective_qty)
			if pass_count == effective_qty:
				row_accepted = True
		
		# 4. Final Status Update for Row
		if row_accepted:
			row.status = "Accepted"
		else:
			row.status = "Rejected"
			all_accepted = False

	# 5. Force Global Document Status
	doc.status = "Accepted" if all_accepted else "Rejected"
