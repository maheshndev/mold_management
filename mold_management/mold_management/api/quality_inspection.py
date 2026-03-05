import frappe
from frappe import _
from frappe.utils import flt

def validate_quality_inspection(doc, method):
	"""
	Hook for Quality Inspection 'validate' event.
	Automates fetching of custom fields from the template.
	"""
	if doc.quality_inspection_template:
		fetch_custom_fields_from_template(doc)

def fetch_custom_fields_from_template(doc):
	"""
	Fetches sample_type, sample_qty, criteria_type, avg from the template
	and updates the readings table if the values are blank.
	"""
	template = doc.quality_inspection_template
	if not template:
		return

	# Fetch parameters from Template
	params = frappe.get_list("Item Quality Inspection Parameter",
		filters={"parent": template},
		fields=["specification", "sample_type", "sample_qty", "criteria_type", "avg"]
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
			# Only update if current value is blank (to preserve manual changes)
			if not row.get("sample_type"):
				row.sample_type = param_data.sample_type
				modified = True
			if not row.get("sample_qty"):
				row.sample_qty = flt(param_data.sample_qty)
				modified = True
			if not row.get("criteria_type"):
				row.criteria_type = param_data.criteria_type
				modified = True
			if not row.get("avg"):
				row.avg = param_data.avg
				modified = True

	return modified
