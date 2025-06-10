frappe.pages['predictive-dash'].on_page_load = async function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Predictive Dashboard',
        single_column: true
    });

    page.set_title(__('Predictive Dashboard'));

    const content = $(`<div class="p-4"></div>`).appendTo(page.body);

    const table_card = $(`
        <div class="card p-4 bg-white rounded shadow">
            <h4 class="text-lg font-semibold mb-4">Predictive Maintenance Data</h4>
            <table class="table table-bordered w-full">
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
    `).appendTo(content);

    const table_body = table_card.find('tbody');

    // Example: Predictive data (Replace with actual server data)
    const predictive_data = await frappe.call({
        method: 'mold_management.mold_management.api.get_predictive_data',
        args: {},
    }).then(r => r.message || []);

    // Cache for mold and parameter data
    const moldCache = {};
    const parameterCache = {};

    const getMoldDetails = async (mold_no) => {
        if (moldCache[mold_no]) return moldCache[mold_no];
        const doc = await frappe.db.get_doc('Mold', mold_no);
        moldCache[mold_no] = doc;
        return doc;
    };

    const getParameterDetails = async (parameter_name) => {
        if (parameterCache[parameter_name]) return parameterCache[parameter_name];
        const doc = await frappe.db.get_doc('Mold Parameter', parameter_name);
        parameterCache[parameter_name] = doc;
        return doc;
    };

    let index = 1;

    for (const row of predictive_data) {
        const mold = await getMoldDetails(row.mold_no);
        const parameter = await getParameterDetails(row.parameter);

        const standard_value = mold[row.parameter.toLowerCase() + '_standard'] || 0;
        const value = parseFloat(row.value);
        const difference = value - standard_value;
        const suggestive_action = parameter.suggestive_action || 'N/A';

        table_body.append(`
            <tr>
                <td>${index++}</td>
                <td>${row.date_time}</td>
                <td>${row.mold_no}</td>
                <td>${row.parameter}</td>
                <td>${value}</td>
                <td>${standard_value}</td>
                <td class="${difference > 0 ? 'text-red-500 font-bold' : 'text-green-600'}">${difference.toFixed(2)}</td>
                <td>${suggestive_action}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="frappe.set_route('Form', 'Mold Maintenance', '')">Schedule</button>
                </td>
            </tr>
        `);
    }
};
