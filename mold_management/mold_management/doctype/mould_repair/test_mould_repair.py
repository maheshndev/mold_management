# Copyright (c) 2017, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt

import unittest

import frappe
from frappe import qb
from frappe.query_builder.functions import Sum
from frappe.utils import add_days, add_months, flt, get_first_day, nowdate, nowtime, today

from mold_management.mold_management.doctype.mould.mould import (
	get_mould_account,
	get_mould_value_after_depreciation,
	make_sales_invoice,
)
from mold_management.mold_management.doctype.mould.test_mould import (
	create_mould,
	create_mould_data,
	set_depreciation_settings_in_company,
)
from mold_management.mold_management.doctype.mould_depreciation_schedule.mould_depreciation_schedule import (
	get_mould_depr_schedule_doc,
)
from erpnext.stock.doctype.item.test_item import create_item
from erpnext.stock.doctype.serial_and_batch_bundle.test_serial_and_batch_bundle import (
	get_serial_nos_from_bundle,
	make_serial_batch_bundle,
)


class MouldRepair(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		set_depreciation_settings_in_company()
		create_mould_data()
		create_item("_Test Stock Item")
		frappe.db.sql("delete from `tabTax Rule`")

		purchase_date = add_months(get_first_day(date), -2)

		mould = create_mould(
			calculate_depreciation=1,
			available_for_use_date=purchase_date,
			purchase_date=purchase_date,
			expected_value_after_useful_life=10000,
			total_number_of_depreciations=10,
			frequency_of_depreciation=1,
			submit=1,
		)

		si = make_sales_invoice(mould=mould.name, item_code="Macbook Pro", company="_Test Company")
		si.customer = "_Test Customer"
		si.due_date = date
		si.get("items")[0].rate = 25000
		si.insert()
		si.submit()

		mould.reload()
		self.assertEqual(frappe.db.get_value("Mould", mould.name, "status"), "Sold")
		mould_repair = frappe.new_doc("Mould Repair")
		mould_repair.update({"company": "_Test Company", "mould": mould.name, "mould_name": mould.mould_name})
		self.assertRaises(frappe.ValidationError, mould_repair.save)

	def test_update_status(self):
		mould = create_mould(submit=1)
		initial_status = mould.status
		mould_repair = create_mould_repair(mould=mould)

		if mould_repair.repair_status == "Pending":
			mould.reload()
			self.assertEqual(mould.status, "Out of Order")

		mould_repair.repair_status = "Completed"
		mould_repair.save()
		mould_status = frappe.db.get_value("Mould", mould_repair.mould, "status")
		self.assertEqual(mould_status, initial_status)

	def test_stock_item_total_value(self):
		mould_repair = create_mould_repair(stock_consumption=1)

		for item in mould_repair.stock_items:
			total_value = flt(item.valuation_rate) * flt(item.consumed_quantity)
			self.assertEqual(item.total_value, total_value)

	def test_total_repair_cost(self):
		mould_repair = create_mould_repair(stock_consumption=1)

		total_repair_cost = mould_repair.repair_cost
		self.assertEqual(total_repair_cost, mould_repair.repair_cost)
		for item in mould_repair.stock_items:
			total_repair_cost += item.total_value

		self.assertEqual(total_repair_cost, mould_repair.total_repair_cost)

	def test_repair_status_after_submit(self):
		mould_repair = create_mould_repair(submit=1)
		self.assertNotEqual(mould_repair.repair_status, "Pending")

	def test_stock_items(self):
		mould_repair = create_mould_repair(stock_consumption=1)
		self.assertTrue(mould_repair.stock_consumption)
		self.assertTrue(mould_repair.stock_items)

	def test_warehouse(self):
		mould_repair = create_mould_repair(stock_consumption=1)
		self.assertTrue(mould_repair.stock_consumption)
		self.assertTrue(mould_repair.stock_items[0].warehouse)

	def test_decrease_stock_quantity(self):
		mould_repair = create_mould_repair(stock_consumption=1, submit=1)
		stock_entry = frappe.get_last_doc("Stock Entry")

		self.assertEqual(stock_entry.stock_entry_type, "Material Issue")
		self.assertEqual(stock_entry.items[0].s_warehouse, mould_repair.stock_items[0].warehouse)
		self.assertEqual(stock_entry.items[0].item_code, mould_repair.stock_items[0].item_code)
		self.assertEqual(stock_entry.items[0].qty, mould_repair.stock_items[0].consumed_quantity)

	def test_serialized_item_consumption(self):
		from erpnext.stock.doctype.stock_entry.test_stock_entry import make_serialized_item

		stock_entry = make_serialized_item()
		bundle_id = stock_entry.get("items")[0].serial_and_batch_bundle
		serial_nos = get_serial_nos_from_bundle(bundle_id)
		serial_no = serial_nos[0]

		# should not raise any error
		create_mould_repair(
			stock_consumption=1,
			item_code=stock_entry.get("items")[0].item_code,
			warehouse="_Test Warehouse - _TC",
			serial_no=[serial_no],
			submit=1,
		)

		# should raise error
		mould_repair = create_mould_repair(
			stock_consumption=1,
			warehouse="_Test Warehouse - _TC",
			item_code=stock_entry.get("items")[0].item_code,
		)

		mould_repair.repair_status = "Completed"
		self.assertRaises(frappe.ValidationError, mould_repair.submit)

	def test_no_increase_in_mould_value_when_not_capitalized(self):
		mould = create_mould(calculate_depreciation=1, submit=1)
		initial_mould_value = get_mould_value_after_depreciation(mould.name)
		create_mould_repair(mould=mould, stock_consumption=1, submit=1)
		mould.reload()

		increase_in_mould_value = get_mould_value_after_depreciation(mould.name) - initial_mould_value
		self.assertEqual(increase_in_mould_value, 0)

	def test_increase_in_mould_value_due_to_repair_cost_capitalisation(self):
		mould = create_mould(calculate_depreciation=1, submit=1)
		initial_mould_value = get_mould_value_after_depreciation(mould.name)
		mould_repair = create_mould_repair(mould=mould, capitalize_repair_cost=1, submit=1)
		mould.reload()

		increase_in_mould_value = get_mould_value_after_depreciation(mould.name) - initial_mould_value
		self.assertEqual(mould_repair.repair_cost, increase_in_mould_value)

	def test_purchase_invoice(self):
		mould_repair = create_mould_repair(capitalize_repair_cost=1, submit=1)
		self.assertTrue(mould_repair.purchase_invoice)

	def test_gl_entries_with_perpetual_inventory(self):
		set_depreciation_settings_in_company(company="_Test Company with perpetual inventory")

		mould_category = frappe.get_doc("Mould Category", "Computers")
		mould_category.append(
			"accounts",
			{
				"company_name": "_Test Company with perpetual inventory",
				"fixed_mould_account": "_Test Fixed Mould - TCP1",
				"accumulated_depreciation_account": "_Test Accumulated Depreciations - TCP1",
				"depreciation_expense_account": "_Test Depreciations - TCP1",
			},
		)
		mould_category.save()

		mould_repair = create_mould_repair(
			capitalize_repair_cost=1,
			stock_consumption=1,
			warehouse="Stores - TCP1",
			company="_Test Company with perpetual inventory",
			submit=1,
		)

		gl_entries = frappe.db.sql(
			"""
			select
				account,
				sum(debit) as debit,
				sum(credit) as credit
			from `tabGL Entry`
			where
				voucher_type='Mould Repair'
				and voucher_no=%s
			group by
				account
		""",
			mould_repair.name,
			as_dict=1,
		)

		self.assertTrue(gl_entries)

		fixed_mould_account = get_mould_account(
			"fixed_mould_account", mould=mould_repair.mould, company=mould_repair.company
		)
		pi_expense_account = (
			frappe.get_doc("Purchase Invoice", mould_repair.purchase_invoice).items[0].expense_account
		)
		stock_entry_expense_account = (
			frappe.get_doc("Stock Entry", {"mould_repair": mould_repair.name}).get("items")[0].expense_account
		)

		expected_values = {
			fixed_mould_account: [mould_repair.total_repair_cost, 0],
			pi_expense_account: [0, mould_repair.repair_cost],
			stock_entry_expense_account: [0, 100],
		}

		for d in gl_entries:
			self.assertEqual(expected_values[d.account][0], d.debit)
			self.assertEqual(expected_values[d.account][1], d.credit)

	def test_gl_entries_with_periodical_inventory(self):
		frappe.db.set_value("Company", "_Test Company", "default_expense_account", "Cost of Goods Sold - _TC")
		mould_repair = create_mould_repair(
			capitalize_repair_cost=1,
			stock_consumption=1,
			submit=1,
		)

		gl_entries = frappe.db.sql(
			"""
			select
				account,
				sum(debit) as debit,
				sum(credit) as credit
			from `tabGL Entry`
			where
				voucher_type='Mould Repair'
				and voucher_no=%s
			group by
				account
		""",
			mould_repair.name,
			as_dict=1,
		)

		self.assertTrue(gl_entries)

		fixed_mould_account = get_mould_account(
			"fixed_mould_account", mould=mould_repair.mould, company=mould_repair.company
		)
		default_expense_account = frappe.get_cached_value(
			"Company", mould_repair.company, "default_expense_account"
		)

		expected_values = {fixed_mould_account: [1100, 0], default_expense_account: [0, 1100]}

		for d in gl_entries:
			self.assertEqual(expected_values[d.account][0], d.debit)
			self.assertEqual(expected_values[d.account][1], d.credit)

	def test_increase_in_mould_life(self):
		mould = create_mould(calculate_depreciation=1, submit=1)

		first_mould_depr_schedule = get_mould_depr_schedule_doc(mould.name, "Active")
		self.assertEqual(first_mould_depr_schedule.status, "Active")

		initial_num_of_depreciations = num_of_depreciations(mould)
		create_mould_repair(mould=mould, capitalize_repair_cost=1, submit=1)

		mould.reload()
		first_mould_depr_schedule.load_from_db()

		second_mould_depr_schedule = get_mould_depr_schedule_doc(mould.name, "Active")
		self.assertEqual(second_mould_depr_schedule.status, "Active")
		self.assertEqual(first_mould_depr_schedule.status, "Cancelled")

		self.assertEqual((initial_num_of_depreciations + 1), num_of_depreciations(mould))
		self.assertEqual(
			second_mould_depr_schedule.get("depreciation_schedule")[-1].accumulated_depreciation_amount,
			mould.finance_books[0].value_after_depreciation,
		)

	def test_mould_repiar_link_in_stock_entry(self):
		mould = create_mould(calculate_depreciation=1, submit=1)
		mould_repair = create_mould_repair(mould=mould, stock_consumption=1, submit=1)
		stock_entry = frappe.get_last_doc("Stock Entry")
		self.assertEqual(stock_entry.mould_repair, mould_repair.name)

	def test_gl_entries_with_capitalized_mould_repair(self):
		mould = create_mould(is_existing_mould=1, calculate_depreciation=1, submit=1)
		mould_repair = create_mould_repair(
			mould=mould, capitalize_repair_cost=1, item="_Test Non Stock Item", submit=1
		)
		mould.reload()

		GLEntry = qb.DocType("GL Entry")
		res = (
			qb.from_(GLEntry)
			.select(Sum(GLEntry.debit_in_account_currency).as_("total_debit"))
			.where(
				(GLEntry.voucher_type == "Mould Repair")
				& (GLEntry.voucher_no == mould_repair.name)
				& (GLEntry.against_voucher_type == "Mould")
				& (GLEntry.against_voucher == mould.name)
				& (GLEntry.company == mould.company)
				& (GLEntry.is_cancelled == 0)
			)
		).run(as_dict=True)
		booked_value = res[0].total_debit if res else 0

		self.assertEqual(mould.additional_mould_cost, mould_repair.repair_cost)
		self.assertEqual(booked_value, mould_repair.repair_cost)


def num_of_depreciations(mould):
	return mould.finance_books[0].total_number_of_depreciations


def create_mould_repair(**args):
	from erpnext.accounts.doctype.purchase_invoice.test_purchase_invoice import make_purchase_invoice
	from erpnext.stock.doctype.warehouse.test_warehouse import create_warehouse

	args = frappe._dict(args)

	if args.mould:
		mould = args.mould
	else:
		mould = create_mould(is_existing_mould=1, submit=1, company=args.company)
	mould_repair = frappe.new_doc("Mould Repair")
	mould_repair.update(
		{
			"mould": mould.name,
			"mould_name": mould.mould_name,
			"failure_date": nowdate(),
			"description": "Test Description",
			"repair_cost": 0,
			"company": mould.company,
		}
	)

	if args.stock_consumption:
		mould_repair.stock_consumption = 1
		warehouse = args.warehouse or create_warehouse("Test Warehouse", company=mould.company)

		bundle = None
		if args.serial_no:
			bundle = make_serial_batch_bundle(
				frappe._dict(
					{
						"item_code": args.item_code,
						"warehouse": warehouse,
						"company": frappe.get_cached_value("Warehouse", warehouse, "company"),
						"qty": (flt(args.stock_qty) or 1) * -1,
						"voucher_type": "Mould Repair",
						"type_of_transaction": "Mould Repair",
						"serial_nos": args.serial_no,
						"posting_date": today(),
						"posting_time": nowtime(),
						"do_not_submit": 1,
					}
				)
			).name

		mould_repair.append(
			"stock_items",
			{
				"item_code": args.item_code or "_Test Stock Item",
				"warehouse": warehouse,
				"valuation_rate": args.rate if args.get("rate") is not None else 100,
				"consumed_quantity": args.qty or 1,
				"serial_and_batch_bundle": bundle,
			},
		)

	mould_repair.insert(ignore_if_duplicate=True)

	if args.submit:
		mould_repair.repair_status = "Completed"
		mould_repair.completion_date = add_days(args.failure_date, 1)
		mould_repair.cost_center = frappe.db.get_value("Company", mould.company, "cost_center")

		if args.stock_consumption:
			stock_entry = frappe.get_doc(
				{"doctype": "Stock Entry", "stock_entry_type": "Material Receipt", "company": mould.company}
			)
			stock_entry.append(
				"items",
				{
					"t_warehouse": mould_repair.stock_items[0].warehouse,
					"item_code": mould_repair.stock_items[0].item_code,
					"qty": mould_repair.stock_items[0].consumed_quantity,
					"basic_rate": args.rate if args.get("rate") is not None else 100,
					"cost_center": mould_repair.cost_center,
				},
			)
			stock_entry.submit()

		if args.capitalize_repair_cost:
			mould_repair.capitalize_repair_cost = 1
			mould_repair.repair_cost = 1000
			if mould.calculate_depreciation:
				mould_repair.increase_in_mould_life = 12
			pi = make_purchase_invoice(
				company=mould.company,
				expense_account=frappe.db.get_value("Company", mould.company, "default_expense_account"),
				cost_center=mould_repair.cost_center,
				warehouse=args.warehouse or create_warehouse("Test Warehouse", company=mould.company),
			)
			mould_repair.purchase_invoice = pi.name

		mould_repair.submit()
	return mould_repair
