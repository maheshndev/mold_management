frappe.pages["in-process-inspectio"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "In Process Quality Inspection Report",
		single_column: true,
	});

	const route_options = frappe.get_route_options();
	const reference_name = route_options ? route_options.reference_name : "";

	$(`
		<div class="row mb-4 no-print">
			<div class="col-md-4">
				<div id="reference_filter"></div>
			</div>
			<div class="col-md-2">
				<button class="btn btn-primary btn-sm mt-1" id="btn-refresh">Refresh</button>
				<button class="btn btn-default btn-sm mt-1" id="btn-print">Print</button>
			</div>
		</div>
		
		<div id="report-container" class="report-container">
			<p class="text-center text-muted">Loading report...</p>
		</div>

		<style>
			.report-container { background: #f8f9fa; padding: 20px; min-height: 800px; }
			.inspection-sheet-wrapper { background: #fff; padding: 40px; border: 1px solid #ddd; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 0 auto; max-width: 1200px; }
			.inspection-sheet { width: 100%; border-collapse: collapse; font-family: 'Inter', sans-serif; font-size: 11px; color: #000; }
			.inspection-sheet th, .inspection-sheet td { border: 1px solid #000; padding: 6px; }
			.header-cell { font-weight: bold; background-color: #f2f2f2; width: 15%; }
			.section-header { font-weight: bold; background-color: #e6e6e6; text-align: left !important; padding: 10px !important; font-size: 13px; }
			.text-center { text-align: center; }
			.text-bold { font-weight: bold; }
			.logo-text { font-size: 24px; font-weight: 900; letter-spacing: 2px; }
			
			@media print {
				.no-print { display: none !important; }
				.report-container { padding: 0; background: #fff; }
				.inspection-sheet-wrapper { padding: 0; border: none; box-shadow: none; margin: 0; max-width: 100%; }
				body { background: #fff !important; }
				.page-break { page-break-after: always; }
			}
		</style>
	`).appendTo(page.body);

	const field = page.add_field(
		{
			label: "Reference (Job Card / Work Order)",
			fieldname: "reference_name",
			fieldtype: "Link",
			options: "Job Card", // Link can handle any but we suggest Job Card
			default: reference_name,
			onchange: () => load_report_data(),
		},
		$("#reference_filter"),
	);

	$("#btn-refresh").on("click", () => load_report_data());
	$("#btn-print").on("click", () => window.print());

	load_report_data();

	async function load_report_data() {
		const ref = page.fields_dict.reference_name.get_value();
		
		$("#report-container").html('<p class="text-center">Loading Report Data...</p>');

		try {
			const response = await frappe.call({
				method: "mold_management.mold_management.page.in_process_inspectio.in_process_inspectio.get_report_data",
				args: { reference_name: ref },
			});

			const data = response.message;
			if (!data || !data.length) {
				$("#report-container").html(
					'<p class="text-center text-muted">No report data found. Please select a valid reference.</p>',
				);
				return;
			}

			// If it was a default load, set the field value
			if (!ref && data[0].job_card) {
				page.fields_dict.reference_name.set_value(data[0].job_card.name);
			}

			render_report(data);
		} catch (err) {
			console.error(err);
			$("#report-container").html(
				'<p class="text-center text-danger">Error loading report data. See console for details.</p>',
			);
		}
	}

	function render_report(sheets) {
		const container = $("#report-container").empty();

		sheets.forEach((sheet, idx) => {
			const html = build_sheet_html(sheet);
			container.append(html);
			if (idx < sheets.length - 1) {
				container.append('<div class="page-break" style="margin-top: 50px;"></div>');
			}
		});
	}

	function build_sheet_html(data) {
		const jc = data.job_card;
		const item = data.item;
		const inspections = data.inspections;
		const parameters = data.parameters;
		const operator = data.operator;

		// Inspections columns
		const col_count = inspections.length;
		const dynamic_headers_top = inspections.map(qi => `<th class="text-center">${qi.inspection_type || "INP"}</th>`).join("");
		const dynamic_headers_time = inspections.map(qi => `<th class="text-center">${qi.time_slot || ""}</th>`).join("");

		let html = `
			<div class="inspection-sheet-wrapper">
				<table class="inspection-sheet">
					<tr>
						<td rowspan="4" class="text-center" style="width: 15%;">
							<div class="logo-text">EXIDE</div>
						</td>
						<td colspan="4" rowspan="4" class="text-center">
							<h2 class="mt-2 mb-2">Inprocess Inspection Sheet</h2>
						</td>
						<td colspan="2" class="header-cell">Doc No & Name:</td>
						<td colspan="2">${jc.name}</td>
					</tr>
					<tr>
						<td colspan="2" class="header-cell">Rev no & Dt:</td>
						<td colspan="2">${jc.custom_rev_no || "00"} / ${jc.custom_rev_date || data.today}</td>
					</tr>
					<tr>
						<td colspan="2" class="header-cell">Page:</td>
						<td colspan="2">1 of 1</td>
					</tr>
					<tr>
						<td colspan="4"></td>
					</tr>

					<tr>
						<td class="header-cell">Part number :</td><td>${jc.production_item}</td>
						<td class="header-cell">ITEM CODE NO:</td><td>${jc.production_item}</td>
						<td class="header-cell">Part Name :</td><td colspan="2">${item.item_name || ""}</td>
						<td class="header-cell">Model :</td><td>${item.model || ""}</td>
					</tr>
					<tr>
						<td class="header-cell">mold No :</td><td>${jc.mould || ""}</td>
						<td class="header-cell">BATCH NO :</td><td>${jc.batch_no || ""}</td>
						<td class="header-cell">Machine number:</td><td>${jc.workstation || ""}</td>
						<td class="header-cell">Inspection Date :</td><td colspan="2">${data.today}</td>
					</tr>
					<tr>
						<td class="header-cell">RM:</td><td>${item.raw_material || ""}</td>
						<td class="header-cell">MB:</td><td>${item.masterbatch || ""}</td>
						<td class="header-cell">OPERATOR NAME :</td><td>${operator}</td>
						<td class="header-cell">SHIFT :</td><td colspan="2">${jc.custom_shift || ""}</td>
					</tr>
				</table>

				<table class="inspection-sheet" style="border-top: none;">
					<thead>
						<tr>
							<th rowspan="2" style="width: 40px;">Sr.no</th>
							<th rowspan="2" style="width: 250px;">Parameter</th>
							<th rowspan="2" style="width: 150px;">Specification and Tolerance</th>
							<th rowspan="2" style="width: 150px;">Equipment Name and Least count</th>
							${dynamic_headers_top}
						</tr>
						<tr>
							${dynamic_headers_time}
						</tr>
					</thead>
					<tbody>
						${render_parameters(parameters, inspections)}
						${render_reject_row(inspections)}
					</tbody>
				</table>

				<table class="inspection-sheet" style="border-top: none;">
					<tr>
						<td style="width: 240px; height: 80px;" class="header-cell text-center">QC INSPECTOR SIGNATURE</td>
						<td colspan="${col_count + 3}"></td>
					</tr>
				</table>
			</div>
		`;

		return html;
	}

	function render_parameters(parameters, inspections) {
		const dimensional = parameters.filter(p => p.parameter_group === "Dimensional");
		const visual = parameters.filter(p => p.parameter_group === "Visual");
		const others = parameters.filter(p => p.parameter_group !== "Dimensional" && p.parameter_group !== "Visual");

		let rows = "";

		if (dimensional.length) {
			rows += `<tr><td colspan="${inspections.length + 4}" class="section-header">A. Dimensional Parameters</td></tr>`;
			dimensional.forEach((p, i) => rows += render_row(p, i + 1, inspections));
		}

		if (visual.length) {
			rows += `<tr><td colspan="${inspections.length + 4}" class="section-header">B. Visual Parameters</td></tr>`;
			visual.forEach((p, i) => rows += render_row(p, i + 1, inspections));
		}

		if (others.length) {
			rows += `<tr><td colspan="${inspections.length + 4}" class="section-header">C. Other Parameters</td></tr>`;
			others.forEach((p, i) => rows += render_row(p, i + 1, inspections));
		}

		return rows;
	}

	function render_row(p, index, inspections) {
		const spec = p.numeric ? `${p.value || ""} ± ${p.tolerance || ""}` : p.value || "";
		const least_count = p.least_count ? ` (${p.least_count})` : "";
		const equipment = `${p.equipment || ""}${least_count}`;

		const dynamic_cells = inspections.map(qi => {
			const reading = qi.readings.find(r => r.specification === p.specification);
			let val = "-";
			let color = "inherit";
			
			if (reading) {
				val = reading.reading_1 || reading.reading_value || "";
				if (reading.status === "Rejected") color = "red";
			}
			
			return `<td class="text-center" style="color: ${color}; min-width: 60px;">${val}</td>`;
		}).join("");

		return `
			<tr>
				<td class="text-center">${index.toString().padStart(2, '0')}</td>
				<td>${p.specification}</td>
				<td class="text-center">${spec}</td>
				<td class="text-center">${equipment}</td>
				${dynamic_cells}
			</tr>
		`;
	}

	function render_reject_row(inspections) {
		const dynamic_cells = inspections.map(qi => {
			const reading = qi.readings.find(r => r.specification === "Total Rej/Set Up Rej (set)");
			let val = reading ? (reading.reading_1 || reading.reading_value || "0") : "0";
			return `<td class="text-center text-bold">${val}</td>`;
		}).join("");

		return `
			<tr>
				<td></td>
				<td class="text-bold">Total Rej / Set Up Rej (set)</td>
				<td></td>
				<td></td>
				${dynamic_cells}
			</tr>
		`;
	}
};
