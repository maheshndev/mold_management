frappe.pages['mold-availability-dash'].on_page_load = async function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Mold Availability Dashboard',
        single_column: true,
    });

    page.set_title(__('Mold Availability Dashboard'));

    // Filters
    const filters_wrapper = $('<div class="mx-4 flex flex-wrap gap-4 mb-4"></div>').appendTo(page.body);
    const filters = {
        date_range: frappe.ui.form.make_control({
            parent: filters_wrapper,
            df: {
                label: 'Date Range',
                fieldtype: 'DateRange',
                fieldname: 'date_range'
            },
            render_input: true
        }),
        mold_type: frappe.ui.form.make_control({
            parent: filters_wrapper,
            df: {
                label: 'Mold Type',
                fieldtype: 'Link',
                options: 'Mold Type',
                fieldname: 'mold_type'
            },
            render_input: true
        }),
        mold: frappe.ui.form.make_control({
            parent: filters_wrapper,
            df: {
                label: 'Mold',
                fieldtype: 'Link',
                options: 'Mold',
                fieldname: 'mold'
            },
            render_input: true
        }),
        status: frappe.ui.form.make_control({
            parent: filters_wrapper,
            df: {
                label: 'Status',
                fieldtype: 'Select',
                options: ['All', 'Available', 'In Use', 'Under Maintenance', 'Planned', 'Scrapped', 'Idle'].join('\n'),
                fieldname: 'status'
            },
            render_input: true
        }),
    };

    // Cards wrapper
    const cards_wrapper = $('<div class="mx-5 flex flex-wrap gap-4 mb-3"></div>').appendTo(page.body);

    // Two-column layout
    const two_col_wrapper = $(`<div class="m-4 row"></div>`).appendTo(page.body);
    const left_col = $(`<div class="cal-2 m-1"></div>`).appendTo(two_col_wrapper);
    const right_col = $(`<div class="cal-2 m-1"></div>`).appendTo(two_col_wrapper);

    // Mold Table
    const mold_table = $(`<div class="card p-4 mb-2 bg-white dark:bg-gray-900 rounded shadow-md">
        <h4 class="text-lg font-semibold mb-2">Mold Status Table</h4>
        <table class="table table-bordered w-full">
            <thead>
                <tr>
                    <th>Mold No</th>
                    <th>Mold Name</th>
                    <th>Status</th>
                    <th>Mold Type</th>
                    <th>Location</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>`).appendTo(left_col);

    // Refresh table + cards
    async function refresh_table() {
        let filters_obj = {}; 

        if (filters.mold_type.get_value()) {
            filters_obj.mold_type = filters.mold_type.get_value();
        }
        if (filters.mold.get_value()) {
            filters_obj.name = filters.mold.get_value();
        }
        if (filters.status.get_value() && filters.status.get_value() !== 'All') {
            filters_obj.status = filters.status.get_value();
        }
        if (filters.date_range.get_value()) {
            const [from_date, to_date] = filters.date_range.get_value();
            if (from_date && to_date) {
                filters_obj.last_maintenance_date = ['between', [from_date, to_date]];
            }
        }

        const mold_data = await frappe.db.get_list('Mold', {
            filters: filters_obj,
            fields: ['name', 'mold_no', 'mold_name', 'mold_type', 'status', 'location'],
            limit: 1000
        });

        // update cards
        cards_wrapper.empty();

        if (!mold_data.length) {
            cards_wrapper.append(`<div class="text-gray-500">No molds found with current filters.</div>`);
        } else {
            const counts = mold_data.reduce((acc, mold) => {
                acc.total++;
                acc[mold.status] = (acc[mold.status] || 0) + 1;
                return acc;
            }, { total: 0 });

            const card_definitions = [
                { status: null, title: 'Total Molds', count: counts.total },
                { status: 'Available', title: 'Molds Available', count: counts['Available'] || 0 },
                { status: 'In Use', title: 'Molds In Use', count: counts['In Use'] || 0 },
                { status: 'Planned', title: 'Molds Planned', count: counts['Planned'] || 0 },
                { status: 'Idle', title: 'Molds Idle', count: counts['Idle'] || 0 },
                { status: 'Scrapped', title: 'Molds Scrapped', count: counts['Scrapped'] || 0 },
                { status: 'Under Maintenance', title: 'Molds Under Maintenance', count: counts['Under Maintenance'] || 0 }
            ];

            card_definitions.forEach(card => {
                if (card.count > 0 || card.status === null) {
                    $(`<div class="card p-3 m-2 bg-white dark:bg-gray-900 rounded shadow-sm min-w-[200px]">
                        <h4 class="text-gray-600">${card.title}</h4>
                        <div class="text-lg font-bold text-center">${card.count}</div>
                    </div>`).appendTo(cards_wrapper);
                }
            });
        }

        // update table
        const tbody = mold_table.find('tbody');
        tbody.empty();

        if (!mold_data.length) {
            tbody.append('<tr><td colspan="5" class="text-center text-gray-500">No molds found.</td></tr>');
            return;
        }

        const moldTypeCache = {};
        const getMoldTypeName = async (mold_type) => {
            if (!mold_type) return '';
            if (moldTypeCache[mold_type]) return moldTypeCache[mold_type];
            try {
                const doc = await frappe.db.get_doc('Mold Type', mold_type);
                moldTypeCache[mold_type] = doc.mold_type_name;
                return doc.mold_type_name;
            } catch {
                moldTypeCache[mold_type] = '';
                return '';
            }
        };

        const moldTypeNames = await Promise.all(
            mold_data.map(mold => getMoldTypeName(mold.mold_type))
        );

        mold_data.forEach((mold, index) => {
            const mold_type_name = moldTypeNames[index] || '';
            tbody.append(`
                <tr>
                    <td>${mold.mold_no}</td>
                    <td>${mold.mold_name || ''}</td>
                    <td><span class="badge ${mold.status === 'Available' ? 'badge-success' : 'badge-danger'}">${mold.status}</span></td>
                    <td>${mold_type_name || ''}</td>
                    <td>${mold.location || ''}</td>
                </tr>
            `);
        });
    }

    // Maintenance Alerts
    const maintenance_table = $(`<div class="card p-4 bg-white dark:bg-gray-900 rounded shadow-md">
        <h4 class="text-lg font-semibold mb-2">Maintenance and Cleaning Alerts</h4>
        <table class="table table-bordered w-full">
            <thead>
                <tr>
                    <th>Mold</th>
                    <th>Last Used</th>
                    <th>Next Maintenance</th>
                    <th>Current Usage Count</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>`).appendTo(left_col);

    const alerts = await frappe.db.get_list('Mold', {
        fields: ['mold_name', 'last_maintenance_date', 'next_maintenance_due', 'current_usage_count'],
        limit: 10
    });

    alerts.forEach(row => {
        maintenance_table.find('tbody').append(`
            <tr>
                <td>${row.mold_name || ''}</td>
                <td>${row.last_maintenance_date || ''}</td>
                <td>${row.next_maintenance_due || ''}</td>
                <td>${row.current_usage_count || ''}</td>
                <td>
                    <button class="btn btn-xs btn-primary schedule-btn" data-mold-name="${row.mold_name}">
                        Schedule
                    </button>
                </td>
            </tr>
        `);
    });

    maintenance_table.find('.schedule-btn').on('click', function () {
        const moldName = $(this).data('mold-name');

        frappe.call({
            method: "frappe.client.insert",
            args: {
                doc: {
                    doctype: "Mold Maintenance",
                    mold_name: moldName
                }
            },
            callback: function (r) {
                if (r.message) {
                    frappe.msgprint(`Mold Maintenance created for ${moldName}`);
                    frappe.set_route("Form", "Mold Maintenance", r.message.name);
                }
            }
        });
    });

    // Quick Actions
    const quick_actions = $(`<div class="card p-4 bg-white dark:bg-gray-800 rounded shadow-md">
        <h4 class="text-lg font-semibold mb-2">Quick Actions</h4>
        <ul class="space-y-2">
            <li><a class="text-blue-600 hover:underline" href="mold/new-mold-zkkmvibbqa"><i class="fa fa-plus-circle"></i> Add New Mold</a></li>
            <li><a class="text-blue-600 hover:underline" href="mold-maintenance/new-mold-maintenance-zkkmvibbqa"><i class="fa fa-calendar"></i> Schedule Maintenance</a></li>
            <li><a class="text-blue-600 hover:underline" href="mold"><i class="fa fa-chart-line"></i> Mold Performance Report</a></li>
            <li><a class="text-blue-600 hover:underline" href="mold"><i class="fa fa-broom"></i> Request Cleaning</a></li>
        </ul>
    </div>`).appendTo(right_col);

    // Initial load
    await refresh_table();

    // Refresh table on filter change
    Object.values(filters).forEach(control => {
        control.$input.on('change', refresh_table);
    });

    page.add_inner_button('Refresh Table', refresh_table);
};
