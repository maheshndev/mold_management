frappe.pages['in-process-inspectio'].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'In Process Inspection Summary',
		single_column: true
	});

	$(`
	<div class="row mb-4">
		<div class="col-md-3">
			<input type="date" class="form-control" id="from_date">
		</div>
		<div class="col-md-3">
			<input type="date" class="form-control" id="to_date">
		</div>
		<div class="col-md-3">
			<select class="form-control" id="filter_item"><option value="">Item Code</option></select>
		</div>
		<div class="col-md-3">
			<select class="form-control" id="filter_reference"><option value="">Reference Name</option></select>
		</div>
	</div>
	<div class="mb-4">
		<button class="btn btn-primary" id="btn-refresh">Refresh</button>
	</div>

	<div class="table-responsive mt-4">
		<table class="table table-bordered table-sm">
			<thead class="thead-light">
				<tr>
					<th>#</th>
					<th>Specification</th>
					<th>Report Date</th>
					<th>Time</th>
					<th>Visual (reading_value)</th>
					<th>Dimensional (reading_1)</th>
				</tr>
			</thead>
			<tbody id="inspection-body"></tbody>
		</table>
	</div>
	<nav>
		<ul class="pagination justify-content-center" id="pagination"></ul>
	</nav>
	`).appendTo(page.body);

	const PAGE_SIZE = 100;
	let allRows = [];
	let currentPage = 1;

	$('#btn-refresh').on('click', () => {
		currentPage = 1;
		load_data();
	});

	load_data();

	function load_data() {
		const from_date = $('#from_date').val();
		const to_date = $('#to_date').val();
		const item_code = $('#filter_item').val();
		const ref_name = $('#filter_reference').val();

		const filters = { reference_type: "Job Card" };
		if (from_date && to_date) filters.report_date = ["between", [from_date, to_date]];
		if (item_code) filters.item_code = item_code;
		if (ref_name) filters.reference_name = ref_name;

		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Quality Inspection",
				fields: ["name", "reference_name", "item_code", "custom_time", "report_date"],
				filters,
				order_by: "reference_name asc, custom_time asc",
				limit: 1000
			},
			callback: function (res) {
				if (!res.message.length) {
					$('#inspection-body').html('<tr><td colspan="6" class="text-center">No records found</td></tr>');
					$('#pagination').empty();
					return;
				}

				populate_dropdowns(res.message);

				const records = res.message;
				allRows = [];
				let completed = 0;

				records.forEach(doc => {
					frappe.call({
						method: "frappe.client.get",
						args: { doctype: "Quality Inspection", name: doc.name },
						callback: function (r) {
							completed++;
							const readings = r.message.readings || [];

							if (!readings.length) {
								// No readings, still add
								allRows.push({
									reference_name: doc.reference_name,
									custom_time: doc.custom_time,
									report_date: doc.report_date,
									specification: '-',
									reading_value: '-',
									reading_1: '-'
								});
							} else {
								readings.forEach(reading => {
									allRows.push({
										reference_name: doc.reference_name,
										custom_time: doc.custom_time,
										report_date: doc.report_date,
										specification: reading.specification || '-',
										reading_value: reading.reading_value || '-',
										reading_1: (reading.reading_1 != null ? reading.reading_1 : '-')
									});
								});
							}

							if (completed === records.length) {
								allRows.sort((a, b) => {
									if (a.reference_name !== b.reference_name) {
										return a.reference_name.localeCompare(b.reference_name);
									}
									return a.custom_time - b.custom_time;
								});
								render_table();
							}
						}
					});
				});
			}
		});
	}

	function populate_dropdowns(records) {
		const items = new Set(), refs = new Set();
		records.forEach(r => {
			if (r.item_code) items.add(r.item_code);
			if (r.reference_name) refs.add(r.reference_name);
		});

		const itemSelect = $('#filter_item').empty().append(`<option value="">Item Code</option>`);
		const refSelect = $('#filter_reference').empty().append(`<option value="">Reference Name</option>`);
		[...items].forEach(i => itemSelect.append(`<option value="${i}">${i}</option>`));
		[...refs].forEach(r => refSelect.append(`<option value="${r}">${r}</option>`));
	}

	function render_table() {
		const tbody = $('#inspection-body').empty();
		const start = (currentPage - 1) * PAGE_SIZE;
		const pageRows = allRows.slice(start, start + PAGE_SIZE);

		if (!pageRows.length) {
			tbody.html('<tr><td colspan="6" class="text-center">No data to display</td></tr>');
			$('#pagination').empty();
			return;
		}

		let lastRef = '';
		pageRows.forEach((row, idx) => {
			if (row.reference_name !== lastRef) {
				tbody.append(`
					<tr class="table-secondary">
						<td colspan="6"><strong>Reference Name: ${frappe.utils.escape_html(row.reference_name || '-')}</strong></td>
					</tr>
				`);
				lastRef = row.reference_name;
			}

			tbody.append(`
				<tr>
					<td>${start + idx + 1}</td>
					<td>${frappe.utils.escape_html(row.specification)}</td>
					<td>${frappe.datetime.str_to_user(row.report_date || '')}</td>
					<td>${frappe.utils.escape_html(row.custom_time || '')}</td>
					<td>${frappe.utils.escape_html(row.reading_value)}</td>
					<td>${frappe.utils.escape_html(row.reading_1)}</td>
				</tr>
			`);
		});

		render_pagination();
	}

	function render_pagination() {
		const totalPages = Math.ceil(allRows.length / PAGE_SIZE);
		const ul = $('#pagination').empty();

		for (let i = 1; i <= totalPages; i++) {
			const li = $(`<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#">${i}</a></li>`);
			li.on('click', () => {
				currentPage = i;
				render_table();
			});
			ul.append(li);
		}
	}
};
