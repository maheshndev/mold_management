frappe.pages['i-production-report'].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Inspection Production Report',
		single_column: true
	});

	$(`
		<div class="row mb-4">
			<div class="col-md-3"><input type="date" class="form-control" id="date"></div>
			<div class="col-md-3"><button class="btn btn-primary w-100" id="btn-fetch">Fetch</button></div>
		</div>
		<div id="report-cards"></div>
	`).appendTo(page.body);

	$('#btn-fetch').on('click', () => load_data());

	function load_data() {
		const date = $('#date').val();
		if (!date) {
			frappe.msgprint(__('Please select a date.'));
			return;
		}

		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Job Card",
				fields: [
					"name", "for_quantity", "total_completed_qty", "operation",
					"production_item", "company", "custom_mold", "workstation"
				],
				filters: { modified: [">=", `${date} 00:00:00`] },
				limit: 100,
				ignore_permissions: 1
			},
			callback({ message: jobs }) {
				if (!jobs.length) {
					$('#report-cards').html('<p class="text-center">No Job Cards found</p>');
					return;
				}

				Promise.all(jobs.map(j => build_job_data(j))).then(cards => {
					$('#report-cards').empty();
					cards.forEach(c => $('#report-cards').append(c));
				});
			}
		});
	}

	async function build_job_data(jc) {
		// Fetch child tables & linked data
		const [job_details, mold_details, qinspections] = await Promise.all([
			frappe.db.get_doc('Job Card', jc.name),
			jc.mold ? frappe.db.get_doc('Mold', jc.mold) : {},
			frappe.db.get_list('Quality Inspection', {
				fields: [
					'name', 'custom_time', 'reference_name', 'reference_type', 'item_code', 'batch_no'
				],
				filters: { reference_name: jc.name },
				ignore_permissions: 1
			})
		]);

		// Time Logs + Employees
		let time_logs = (job_details.time_logs || []).map(tl => {
			const dt = frappe.datetime.str_to_obj(tl.to_time);
			return {
				time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
				complete_qty: tl.completed_qty
			};
		});

		let employees = (job_details.employees || []).map(e => e.employee_name).join(', ') || '-';

		// Mold
		const mold_no = mold_details.mold_no || '-';
		const cavity_count = mold_details.cavity_count || '-';

		// Quality Inspection Readings
		let inspections_with_readings = await Promise.all(qinspections.map(async qi => {
			let readings = await frappe.db.get_list('Quality Inspection Reading', {
				fields: ['specification', 'reading_value', 'reading_1'],
				filters: { parent: qi.name },
				ignore_permissions: 1,
				parent_doctype: "Quality Inspection"
			});
			qi.readings = readings || [];
			qi.custom_time = convert_time(qi.custom_time);
			return qi;
		}));

		// Build card HTML
		const card = $(`
			<div class="card mb-3">
				<div class="card-header">
					<h5>${jc.name} - ${jc.operation}</h5>
				</div>
				<div class="card-body">
					<div class="row mb-2">
						<div class="col-md-3"><strong>Shift:</strong> - </div>
						<div class="col-md-3"><strong>Date:</strong> - </div>
						<div class="col-md-3"><strong>Machine:</strong> ${jc.workstation}</div>
						<div class="col-md-3"><strong>Operator:</strong> ${employees}</div>
					</div>
					<div class="row mb-2">
						<div class="col-md-3"><strong>Shot Weight:</strong> - </div>
						<div class="col-md-3"><strong>Runner Weight:</strong> - </div>
						<div class="col-md-3"><strong>Item Code No:</strong> ${jc.production_item}</div>
						<div class="col-md-3"><strong>Total No Cavity:</strong> ${cavity_count}</div>
					</div>
					<div class="row mb-2">
						<div class="col-md-3"><strong>Batch No:</strong> - </div>
						<div class="col-md-3"><strong>Row Material:</strong> - </div>
						<div class="col-md-3"><strong>Grade:</strong> - </div>
						<div class="col-md-3"><strong>Mold:</strong> ${mold_no}</div>
					</div>

					<div class="table-responsive mt-3">
						<table class="table table-bordered table-sm">
							<thead>
								<tr>
									<th>Time</th>
									<th>Ok Shots</th>
									<th>Rejected Shots</th>
									<th>Total Shots</th>
									<th>Rejected Code</th>
									<th>Remarks</th>
								</tr>
							</thead>
							<tbody></tbody>
						</table>
					</div>
				</div>
			</div>
		`);

		const tbody = card.find('tbody');

		time_logs.forEach(tl => {
			tbody.append(`
				<tr>
					<td>${tl.time}</td>
					<td>${tl.complete_qty}</td>
					<td>-</td>
					<td>${jc.for_quantity}</td>
					<td>-</td>
					<td>-</td>
				</tr>
			`);
		});

		inspections_with_readings.forEach(qi => {
			let rejected_spec = qi.readings.find(r => r.specification === 'Total Rej/Set Up Rej (set)');
			let rejected_value = rejected_spec ? (rejected_spec.reading_value || rejected_spec.reading_1) : '-';

			tbody.append(`
				<tr>
					<td>${qi.custom_time}</td>
					<td>-</td>
					<td>${rejected_value}</td>
					<td>${jc.for_quantity}</td>
					<td>-</td>
					<td>-</td>
				</tr>
			`);
		});

		return card;
	}

	function convert_time(str) {
		if (!str) return '-';
		let dt = frappe.datetime.str_to_obj(`2020-01-01 ${str}`);
		return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
};
