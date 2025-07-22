frappe.pages['i-production-report'].on_page_load = function(wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Inspection Production Report',
		single_column: true
	});

	$(`
		<div class="row mb-4">
			<div class="col-md-3"><input type="date" class="form-control" id="report_date"></div>
			<div class="col-md-3"><select class="form-control" id="reference_name"><option value="">Reference Name</option></select></div>
			<div class="col-md-3"><select class="form-control" id="item_code"><option value="">Item Code</option></select></div>
			<div class="col-md-3"><button class="btn btn-primary" id="btn-generate">Generate Report</button></div>
		</div>
		<div id="production-table"></div>
	`).appendTo(page.body);

	let records_all = [];

	$('#btn-generate').on('click', () => {
		const date = $('#report_date').val();
		const ref = $('#reference_name').val();
		const item = $('#item_code').val();

		if (!date) {
			frappe.msgprint("Please select a date");
			return;
		}

		load_data(date, ref, item);
	});

	populate_dropdowns();

	function populate_dropdowns() {
		frappe.db.get_list("Quality Inspection", {
			fields: ["reference_name", "item_code"],
			limit: 500
		}).then(data => {
			const refs = new Set(), items = new Set();
			data.forEach(r => {
				if (r.reference_name) refs.add(r.reference_name);
				if (r.item_code) items.add(r.item_code);
			});
			const refSel = $('#reference_name').empty().append(`<option value="">Reference Name</option>`);
			const itemSel = $('#item_code').empty().append(`<option value="">Item Code</option>`);
			refs.forEach(r => refSel.append(`<option value="${r}">${r}</option>`));
			items.forEach(i => itemSel.append(`<option value="${i}">${i}</option>`));
		});
	}

	function load_data(date, ref, item) {
		let filters = { report_date: date };
		if (ref) filters.reference_name = ref;
		if (item) filters.item_code = item;

		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Quality Inspection",
				fields: ["name", "reference_name", "item_code", "custom_time", "report_date"],
				filters: filters,
				order_by: "custom_time asc",
				limit: 1000
			},
			callback({ message }) {
				records_all = message;
				if (!message.length) {
					$('#production-table').html('<p class="text-center">No records found</p>');
					return;
				}
				render_table();
			}
		});
	}

	function render_table() {
		const grouped = {};

		records_all.forEach(r => {
			const hour = getHour(r.custom_time);
			if (!grouped[hour]) grouped[hour] = [];
			grouped[hour].push(r);
		});

		const tbl = $(`
			<div class="table-responsive">
				<table class="table table-bordered">
					<thead>
						<tr>
							<th>Time Slot</th>
							<th>OK Shots</th>
							<th>Rejected Shots</th>
							<th>Total Shots</th>
							<th>Rejection Reason</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		`);
		const tbody = tbl.find('tbody');

		let total_ok = 0, total_rej = 0;

		const hours = Object.keys(grouped).sort((a,b) => a-b);

		const promises = [];

		hours.forEach(hour => {
			let ok_shots = 0, rej_shots = 0, rej_reason = "-";

			grouped[hour].forEach(r => {
				// Assuming Quality Inspection Reading has status & value
				const p = frappe.call({
					method: "frappe.client.get_list",
					args: {
						doctype: "Quality Inspection Reading",
						filters: { parent: r.name },
						fields: ["specification", "reading_value"],
					}
				}).then(res => {
					res.message.forEach(reading => {
						if (reading.reading_value == 'OK') ok_shots++;
						else {
							rej_shots++;
							rej_reason = reading.specification;
						}
					});
				});
				promises.push(p);
			});

			Promise.all(promises).then(() => {
				total_ok += ok_shots;
				total_rej += rej_shots;

				const total = ok_shots + rej_shots;

				tbody.append(`
					<tr>
						<td>${hour}:00 - ${parseInt(hour)+1}:00</td>
						<td>${ok_shots}</td>
						<td>${rej_shots}</td>
						<td>${total}</td>
						<td>${rej_reason}</td>
					</tr>
				`);

				$('#production-table').html(tbl);

				// Append summary
				if (hours.indexOf(hour) === hours.length-1) {
					tbody.append(`
						<tr class="table-info">
							<td><b>Total</b></td>
							<td><b>${total_ok}</b></td>
							<td><b>${total_rej}</b></td>
							<td><b>${total_ok+total_rej}</b></td>
							<td>-</td>
						</tr>
					`);
				}
			});
		});
	}

	function getHour(time_str) {
		if (!time_str) return "00";
		return time_str.split(":")[0];
	}
};
