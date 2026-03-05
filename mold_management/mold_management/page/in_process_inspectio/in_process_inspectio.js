frappe.pages["in-process-inspectio"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "In Process Quality Inspection Report",
		single_column: true,
	});

	const reference_name = frappe.get_route_options()?.reference_name || "";

	$(`
		<div class="row mb-4 no-print">
			<div class="col-md-3">
				<div id="reference_filter"></div>
			</div>
			<div class="col-md-2">
				<button class="btn btn-primary btn-sm mt-1" id="btn-refresh">Refresh</button>
				<button class="btn btn-default btn-sm mt-1" id="btn-print">Print</button>
			</div>
		</div>
		
		<div id="report-container" class="report-container">
			<p class="text-center text-muted">Please select a Job Card or Work Order to view the report.</p>
		</div>

		<style>
			.report-container { background: #fff; padding: 20px; min-height: 500px; }
			.inspection-sheet { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; color: #000; }
			.inspection-sheet th, .inspection-sheet td { border: 1px solid #000; padding: 4px; }
			.header-cell { font-weight: bold; background-color: #f2f2f2; }
			.section-header { font-weight: bold; background-color: #e6e6e6; text-align: left !important; }
			.text-center { text-align: center; }
			.text-bold { font-weight: bold; }
			.logo-box { width: 120px; position: relative; }
			.logo-box img { max-width: 100%; height: auto; }
			
			@media print {
				.no-print { display: none !important; }
				.report-container { padding: 0; border: none; }
				body { background: #fff !important; }
				.page-break { page-break-after: always; }
			}
		</style>
	`).appendTo(page.body);

	const field = page.add_field(
		{
			label: "Reference",
			fieldname: "reference_name",
			fieldtype: "Link",
			options: "Job Card", // Default to Job Card, but can handle Work Order
			default: reference_name,
			onchange: () => load_report_data(),
		},
		$("#reference_filter"),
	);

	$("#btn-refresh").on("click", () => load_report_data());
	$("#btn-print").on("click", () => window.print());

	if (reference_name) {
		load_report_data();
	}

	async function load_report_data() {
		const ref = page.fields_dict.reference_name.get_value();
		if (!ref) {
			$("#report-container").html(
				'<p class="text-center text-muted">Please select a reference.</p>',
			);
			return;
		}

		$("#report-container").html('<p class="text-center">Loading...</p>');

		try {
			// Identify if it's a Job Card or Work Order
			const ref_doctype = await get_reference_doctype(ref);
			let job_cards = [];
			let work_order = null;

			if (ref_doctype === "Job Card") {
				const jc = await frappe.db.get_doc("Job Card", ref);
				job_cards = [jc];
				if (jc.work_order) {
					work_order = await frappe.db.get_doc("Work Order", jc.work_order);
				}
			} else if (ref_doctype === "Work Order") {
				work_order = await frappe.db.get_doc("Work Order", ref);
				job_cards = await frappe.db.get_list("Job Card", {
					filters: { work_order: ref, docstatus: ["<", 2] },
					fields: ["*"],
				});
			}

			if (!job_cards.length) {
				$("#report-container").html(
					'<p class="text-center text-muted">No Job Cards found.</p>',
				);
				return;
			}

			render_report(job_cards, work_order);
		} catch (err) {
			console.error(err);
			$("#report-container").html(
				'<p class="text-center text-danger">Error loading report data. See console.</p>',
			);
		}
	}

	async function get_reference_doctype(ref) {
		// A simple heuristic or database check
		const is_jc = await frappe.db.exists("Job Card", ref);
		if (is_jc) return "Job Card";
		const is_wo = await frappe.db.exists("Work Order", ref);
		if (is_wo) return "Work Order";
		return "Job Card"; // Fallback
	}

	async function render_report(job_cards, work_order) {
		const container = $("#report-container").empty();

		for (const jc of job_cards) {
			const html = await build_inspection_sheet(jc, work_order);
			container.append(html);
			container.append('<div class="page-break"></div>');
		}
	}

	async function build_inspection_sheet(jc, wo) {
		// Fetch metadata
		const item = await frappe.db.get_doc("Item", jc.production_item);
		const mold = jc.mould ? await frappe.db.get_doc("Mould", jc.mould) : null;

		// Fetch Template
		const template_name =
			item.in_process_inspection_template || item.quality_inspection_template;
		let parameters = [];
		if (template_name) {
			parameters = await frappe
				.call({
					method: "mold_management.api.production_log_api.get_qi_template_parameters",
					args: { template: template_name },
				})
				.then((r) => r.message || []);
		}

		// Fetch Quality Inspections linked to this Job Card
		const inspections = await frappe.db.get_list("Quality Inspection", {
			filters: { reference_name: jc.name, docstatus: 1, inspection_type: "In Process" },
			fields: ["name", "report_date", "inspected_by", "time_slot"],
			order_by: "time_slot asc",
		});

		for (const qi of inspections) {
			qi.readings = await frappe.db.get_list("Quality Inspection Reading", {
				filters: { parent: qi.name },
				fields: ["specification", "reading_value", "reading_1", "status"],
			});
		}

		// Organizing columns: Inspections
		const columns = inspections.map((qi) => ({
			name: qi.name,
			time: qi.time_slot || "",
		}));

		// Header HTML pieces
		const operator = jc.employees && jc.employees.length ? jc.employees[0].employee_name : "";
		const shift = jc.custom_shift || "";

		let html = `
			<div class="inspection-sheet-wrapper mb-5">
				<table class="inspection-sheet">
					<tr>
						<td rowspan="4" class="logo-box text-center">
							<div class="text-bold" style="font-size: 16px;">EXIDE</div>
						</td>
						<td colspan="4" rowspan="4" class="text-center">
							<h3 class="mt-2 mb-2">Inprocess Inspection Sheet</h3>
						</td>
						<td colspan="2" class="header-cell">Doc No & Name:</td>
						<td colspan="2">${jc.name}</td>
					</tr>
					<tr>
						<td colspan="2" class="header-cell">Rev no & Dt:</td>
						<td colspan="2">00 / ${frappe.datetime.get_today()}</td>
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
						<td class="header-cell">Inspection Date :</td><td colspan="2">${frappe.datetime.get_today()}</td>
					</tr>
					<tr>
						<td class="header-cell">RM:</td><td>${item.raw_material || ""}</td>
						<td class="header-cell">MB:</td><td>${item.masterbatch || ""}</td>
						<td class="header-cell">OPERATOR NAME :</td><td>${operator}</td>
						<td class="header-cell">SHIFT :</td><td colspan="2">${shift}</td>
					</tr>
				</table>

				<table class="inspection-sheet" style="border-top: none;">
					<thead>
						<tr>
							<th rowspan="2" style="width: 40px;">Sr.no</th>
							<th rowspan="2" style="width: 200px;">Parameter</th>
							<th rowspan="2" style="width: 120px;">Specification and Tolerance</th>
							<th rowspan="2" style="width: 120px;">Equipment Name and Least count</th>
							${columns.map((c) => `<th class="text-center">${c.type}</th>`).join("")}
						</tr>
						<tr>
							${columns.map((c) => `<th class="text-center">TIME: ${c.time}</th>`).join("")}
						</tr>
					</thead>
					<tbody>
						${render_parameter_rows(parameters, inspections)}
					</tbody>
				</table>

				<table class="inspection-sheet" style="border-top: none;">
					<tr>
						<td style="width: 240px; height: 60px;" class="header-cell text-center">QC INSPECTOR SIGNATURE</td>
						<td colspan="${columns.length + 3}"></td>
					</tr>
				</table>
			</div>
		`;

		return html;
	}

	function render_parameter_rows(parameters, inspections) {
		const dimensional = parameters.filter((p) => p.parameter_group === "Dimensional");
		const visual = parameters.filter((p) => p.parameter_group === "Visual");
		const others = parameters.filter(
			(p) => p.parameter_group !== "Dimensional" && p.parameter_group !== "Visual",
		);

		let rows = "";

		if (dimensional.length) {
			rows += `<tr><td colspan="${inspections.length + 4}" class="section-header">A. Dimensional Parameters</td></tr>`;
			dimensional.forEach((p, i) => (rows += render_row(p, i + 1, inspections)));
		}

		if (visual.length) {
			rows += `<tr><td colspan="${inspections.length + 4}" class="section-header">B. Visual Parameters</td></tr>`;
			visual.forEach((p, i) => (rows += render_row(p, i + 1, inspections)));
		}

		if (others.length) {
			rows += `<tr><td colspan="${inspections.length + 4}" class="section-header">C. Other Parameters</td></tr>`;
			others.forEach((p, i) => (rows += render_row(p, i + 1, inspections)));
		}

		// Reject count row as per image
		rows += `
			<tr>
				<td></td>
				<td class="text-bold">Total Rej / Set Up Rej (set)</td>
				<td></td>
				<td></td>
				${inspections
					.map((qi) => {
						const rej_reading = qi.readings.find(
							(r) => r.specification === "Total Rej/Set Up Rej (set)",
						);
						return `<td class="text-center">${rej_reading ? rej_reading.reading_value || rej_reading.reading_1 || "0" : "0"}</td>`;
					})
					.join("")}
			</tr>
		`;

		return rows;
	}

	function render_row(p, index, inspections) {
		const spec = p.numeric ? `${p.value || ""} ± ${p.tolerance || ""}` : p.value || "";

		const least_count = p.least_count ? ` (${p.least_count})` : "";
		const equipment = `${p.equipment || ""}${least_count}`;

		return `
			<tr>
				<td class="text-center">${index.toString().padStart(2, "0")}</td>
				<td>${p.specification}</td>
				<td class="text-center">${spec}</td>
				<td class="text-center">${equipment}</td>
				${inspections
					.map((qi) => {
						const reading = qi.readings.find(
							(r) => r.specification === p.specification,
						);
						let val = reading ? reading.reading_1 || reading.reading_value || "" : "-";
						let color = reading && reading.status === "Rejected" ? "red" : "inherit";
						return `<td class="text-center" style="color: ${color}">${val}</td>`;
					})
					.join("")}
			</tr>
		`;
	}
};
