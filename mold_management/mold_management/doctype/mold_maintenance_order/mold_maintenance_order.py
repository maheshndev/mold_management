# Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.document import Document
from frappe.query_builder import DocType
from frappe.utils import getdate, nowdate, today

from mold_management.mold_management.doctype.mold_maintenance.mold_maintenance import calculate_next_due_date
from mold_management.mold_management.doctype.required_parts.required_parts import RequiredParts


class MoldMaintenanceOrder(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		actions_performed: DF.TextEditor | None
		amended_from: DF.Link | None
		mold_maintenance: DF.Link | None
		mold_name: DF.ReadOnly | None
		assign_to_name: DF.ReadOnly | None
		certificate_attachement: DF.Attach | None
		completion_date: DF.Date | None
		description: DF.ReadOnly | None
		due_date: DF.Date | None
		has_certificate: DF.Check
		required_parts: DF.Table[RequiredParts] | None
		maintenance_status: DF.Literal["Planned", "Completed", "Cancelled", "Overdue"]
		maintenance_type: DF.ReadOnly | None
		naming_series: DF.Literal["ACC-AML-.YYYY.-"]
		periodicity: DF.Data | None
		task: DF.Link | None
		task_assignee_email: DF.Data | None
		task_name: DF.Data | None
		maintenance_team: DF.Literal["In-house", "Out-source"]
	# end: auto-generated types

	def validate(self):
		if getdate(self.due_date) < getdate(nowdate()) and self.maintenance_status not in [
			"Completed",
			"Cancelled",
		]:
			self.maintenance_status = "Overdue"

		if self.maintenance_status == "Completed" and not self.completion_date:
			frappe.throw(_("Please select Completion Date for Completed Mold Maintenance Order"))

		if self.maintenance_status != "Completed" and self.completion_date:
			frappe.throw(_("Please select Maintenance Status as Completed or remove Completion Date"))

	def on_submit(self):
		if self.maintenance_status not in ["Completed", "Cancelled"]:
			frappe.throw(_("Maintenance Status has to be Cancelled or Completed to Submit"))
		self.update_maintenance_task()

	def update_maintenance_task(self):
		mold_maintenance_doc = frappe.get_doc("Mold Maintenance Task", self.task)
		if self.maintenance_status == "Completed":
			if mold_maintenance_doc.last_completion_date != self.completion_date:
				next_due_date = calculate_next_due_date(
					periodicity=self.periodicity, last_completion_date=self.completion_date
				)
				mold_maintenance_doc.last_completion_date = self.completion_date
				mold_maintenance_doc.next_due_date = next_due_date
				mold_maintenance_doc.maintenance_status = "Planned"
				mold_maintenance_doc.save()
		if self.maintenance_status == "Cancelled":
			mold_maintenance_doc.maintenance_status = "Cancelled"
			mold_maintenance_doc.save()
		mold_maintenance_doc = frappe.get_doc("Mold Maintenance", self.mold_maintenance)
		mold_maintenance_doc.save()


def update_mold_maintenance_order_status():
	MoldMaintenanceOrder = DocType("Mold Maintenance Order")
	(
		frappe.qb.update(MoldMaintenanceOrder)
		.set(MoldMaintenanceOrder.maintenance_status, "Overdue")
		.where(
			(MoldMaintenanceOrder.maintenance_status == "Planned") & (MoldMaintenanceOrder.due_date < today())
		)
	).run()


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_maintenance_tasks(doctype, txt, searchfield, start, page_len, filters):
	mold_maintenance_tasks = frappe.db.get_values(
		"Mold Maintenance Task", {"parent": filters.get("mold_maintenance")}, "maintenance_task"
	)
	return mold_maintenance_tasks
