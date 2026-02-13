frappe.pages["daily-production-rep"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Daily Production Report",
		single_column: true,
	});

	let currentIndex = 0;
	let records = [];

	const container = $(`<div class="daily-production-report-container"></div>`);
	const nav = $(`
        <div class="pagination-controls" style="margin: 10px 0; text-align: center;">
            <button class="btn btn-default prev-btn" disabled>Previous</button>
            <span class="page-info" style="margin: 0 15px;"></span>
            <button class="btn btn-default next-btn" disabled>Next</button>
        </div>
    `);

	$(page.body).append(container);
	$(page.body).append(nav);

	const log_name = frappe.get_route()[2];

	function renderPage(index) {
		if (records.length === 0) {
			container.html("<p>No records found.</p>");
			return;
		}

		const doc = records[index];

		// Build HTML for each record
		const html = `
            <style>
                h3 { margin: 0; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                table, th, td { border: 1px solid #ccc; }
                th, td { padding: 8px; text-align: center; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .section-title { background-color: #e6f2ff; font-weight: bold; text-align: left; width: 150px; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .header-table td { border: none; background-color: #fff; }
                .header-table { border: none; margin-bottom: 10px; }
                ul { padding: 0; margin: 0; list-style: none; text-align: left; }
                .field-value { text-align: center; background-color: #fff; }
            </style>

            <!-- Header -->
            <table class="header-table">
                <tr>
                    <td colspan="2"><strong>${doc.company || ""}</strong></td>
                    <td colspan="5" style="text-align:center;"><h3>Daily Production Report</h3></td>
                    <td colspan="2">
                        <ul>
                            <li>Doc No: ${doc.name || ""}</li>
                            <li>Rev No: ${doc.rev_no || ""}</li>
                            <li>Page: ${index + 1}</li>
                        </ul>
                    </td>
                </tr>
            </table>

            <!-- Main Details -->
            <table>
                <tr>
                    <td class="section-title">Shift Details</td><td class="field-value">${doc.shift || ""}</td>
                    <td class="section-title">Date</td><td class="field-value">${doc.report_date || ""}</td>
                    <td class="section-title">Machine No</td><td class="field-value">${doc.machine_no || ""}</td>
                </tr>
                <tr>
                    <td class="section-title">Product Name</td><td colspan="2" class="field-value">${doc.product_name || ""}</td>
                    <td class="section-title">Operator Name</td><td colspan="2" class="field-value">${doc.operator_name || ""}</td>
                </tr>
                <tr>
                    <td class="section-title">Shot Weight</td><td class="field-value">${doc.shot_weight || ""}</td>
                    <td class="section-title">Runner Weight</td><td class="field-value">${doc.runner_weight || ""}</td>
                    <td class="section-title">Item Code No</td><td class="field-value">${doc.item_code || ""}</td>
                </tr>
                <tr>
                    <td class="section-title">Raw Material</td><td class="field-value">${doc.raw_material || ""}</td>
                    <td class="section-title">Grade</td><td class="field-value">${doc.raw_material_grade || ""}</td>
                    <td class="section-title">Batch No</td><td class="field-value">${doc.raw_material_batch_no || ""}</td>
                </tr>
                <tr>
                    <td class="section-title">Masterbatch</td><td class="field-value">${doc.masterbatch || ""}</td>
                    <td class="section-title">Grade</td><td class="field-value">${doc.masterbatch_grade || ""}</td>
                    <td class="section-title">Batch No</td><td class="field-value">${doc.masterbatch_batch_no || ""}</td>
                </tr>
                <tr>
                    <td class="section-title">First Counter</td><td class="field-value">${doc.first_counter || ""}</td>
                    <td class="section-title">Cycle Time</td><td class="field-value">${doc.cycle_time || ""}</td>
                    <td class="section-title">Shift Target</td><td class="field-value">${doc.shift_target || ""}</td>
                </tr>
                <tr>
                    <td class="section-title">Total No Cavity</td><td class="field-value">${doc.total_cavity || ""}</td>
                    <td class="section-title">Running Cavity</td><td class="field-value">${doc.running_cavity || ""}</td>
                    <td class="section-title">Anti Static</td><td class="field-value">${doc.anti_static || ""}</td>
                </tr>
            </table>

            
            <!-- Production Data -->
            <table>
                <tr>
                    <th>Time</th>
                    <th>OK Shots</th>
                    <th>Reject Shots</th>
                    <th>Total Shots</th>
                    <th>Reject Code</th>
                    <th>Remarks</th>
                </tr>

                ${
					doc.production_data && doc.production_data.length
						? doc.production_data
								.map(
									(row) => `
                            <tr>
                                <td>${row.time_slot || ""}</td>
                                <td>${row.ok_shots ?? 0}</td>
                                <td>${row.rej_shots ?? 0}</td>
                                <td>${row.total_shots ?? 0}</td>
                                <td>${row.rej_code || ""}</td>
                                <td>${row.remarks || ""}</td>
                            </tr>
                        `,
								)
								.join("")
						: `
                            <tr>
                                <td colspan="6" style="text-align:center; color:#888;">
                                    No Production Shots Data
                                </td>
                            </tr>
                        `
				}
            </table>


            <!-- Summary -->
            <table>
                <tr>
                    <td class="section-title">Last Counter</td><td class="field-value">${doc.last_counter || ""}</td>
                    <td class="section-title">OK Shots</td><td class="field-value">${doc.total_ok_shots || ""}</td>
                    <td class="section-title">Rej Shots</td><td class="field-value">${doc.total_rej_shots || ""}</td>
                    <td class="section-title">Total Shots</td><td class="field-value">${doc.total_shots || ""}</td>
                </tr>
                <tr>
                    <td class="section-title">RM Consumption</td><td class="field-value">${doc.rm_consumption || ""}</td>
                    <td class="section-title">Lumps</td><td class="field-value">${doc.lumps || ""}</td>
                    <td class="section-title">Supervisor Sign</td><td colspan="3" class="field-value">${doc.supervisor_sign || ""}</td>
                </tr>
            </table>
        `;

		container.html(html);

		// Update nav
		$(".page-info").text(`Page ${index + 1} of ${records.length}`);
		$(".prev-btn").prop("disabled", index === 0);
		$(".next-btn").prop("disabled", index === records.length - 1);
	}

	// Fetch Data from custom API to include child tables
	frappe.call({
		method: "mold_management.mold_management.page.daily_production_rep.daily_production_rep.get_production_log_details",
		args: {
			name: log_name,
		},
		callback: function (r) {
			if (r.message) {
				if (Array.isArray(r.message)) {
					records = r.message;
				} else {
					records = [r.message];
					// Hide pagination if single record
					nav.hide();
				}
				renderPage(currentIndex);
			}
		},
	});

	// Pagination controls
	nav.find(".prev-btn").on("click", function () {
		if (currentIndex > 0) {
			currentIndex--;
			renderPage(currentIndex);
		}
	});

	nav.find(".next-btn").on("click", function () {
		if (currentIndex < records.length - 1) {
			currentIndex++;
			renderPage(currentIndex);
		}
	});
};
