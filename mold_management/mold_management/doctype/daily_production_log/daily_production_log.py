import frappe
from frappe.model.document import Document
from frappe.utils import flt

class DailyProductionLog(Document):
	def validate(self):
		self.calculate_totals()

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
		
		# RM Consumption calculation
		if self.shot_weight or self.runner_weight:
			s_wt = flt(self.shot_weight)
			r_wt = flt(self.runner_weight)
			self.rm_consumption = (s_wt + r_wt) * self.total_shots / 1000
