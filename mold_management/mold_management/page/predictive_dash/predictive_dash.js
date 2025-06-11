frappe.pages['predictive-dash'].on_page_load = async function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Predictive Dashboard',
        single_column: true
    });

    const content = $(`<div class="p-4"></div>`).appendTo(page.body);

    const table_card = $(` 
        <div class="card p-4 bg-white rounded shadow">
            <h4 class="text-lg font-semibold mb-4">Predictive Maintenance Data</h4>
            <div class="overflow-auto">
                <table class="table table-bordered w-full text-sm">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Date Time</th>
                            <th>Mold No</th>
                            <th>Parameter</th>
                            <th>Value</th>
                            <th>Standard Value</th>
                            <th>Difference</th>
                            <th>Suggestive Action</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `).appendTo(content);

    const tbody = table_card.find('tbody');

    let predictive_data = [];
    try {
        const response = await frappe.call({
            method: 'mold_management.api.get_predictive_data'
        });
        predictive_data = response.message || [];
    } catch (error) {
        frappe.msgprint(__('Failed to load predictive data'));
        console.error(error);
        return;
    }

    predictive_data.forEach((row, idx) => {
        const difference = parseFloat(row.difference || 0);

        let row_color = '';
        if (difference > 0) {
            row_color = '#FF8282'; // Red
        } else if (difference < 0) {
            row_color = '#B0DB9C'; // Green
        } else {
            row_color = '#F97A00'; // Orange
        }

        const suggestive_action = difference > 0 ? (row.suggestive_action || 'N/A') : 'N/A';

        const action_button = difference > 0
            ? `<button class="btn btn-sm btn-primary" onclick="frappe.set_route('Form', 'Mold Maintenance', 'new')">Schedule</button>`
            : '';

        tbody.append(`
            <tr style="background-color: ${row_color}">
                <td>${idx + 1}</td>
                <td>${frappe.datetime.str_to_user(row.date_time || '')}</td>
                <td>${row.mold_no}</td>
                <td>${row.parameter}</td>
                <td>${row.value}</td>
                <td>${row.standard_value}</td>
                <td class="font-bold">${difference.toFixed(2)}</td>
                <td>${suggestive_action}</td>
                <td>${action_button}</td>
            </tr>
        `);
    });
};
