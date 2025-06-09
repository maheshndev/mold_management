frappe.pages['mold-availability-dash'].on_page_load = async function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Mold Availability Dashboard',
        single_column: true,
        
    });

    // Page title
    page.set_title(__('Mold Availability Dashboard'));

      // Filters
    const filters_wrapper = $('<div class="mx-5 flex flex-wrap gap-4 mb-4"></div>').appendTo(page.body);
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
        products_parts: frappe.ui.form.make_control({
            parent: filters_wrapper,
            df: {
                label: 'Product Part',
                fieldtype: 'Link',
                fieldname: 'products_parts',
                options: 'Item'
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
                options: ['All', 'Available', 'In Use', 'Under Maintenance', 'Planned','Scrapped','Idle'].join('\n'),
                fieldname: 'status'
            },
            render_input: true
        }),
    };

    // Status cards
    const cards_wrapper = $('<div class="mx-5 flex flex-wrap gap-4 mb-6"></div>').appendTo(page.body);
    const status_counts = await frappe.db.get_list('Mold', {
        fields: ['status'],
        limit: 1000
    });

    const total = status_counts.length;
    const available = status_counts.filter(m => m.status === 'Available').length;
    const in_use = status_counts.filter(m => m.status === 'In Use').length;
    const mold_is_planned = status_counts.filter(m => m.status === 'Planned').length;
    const mold_is_idle = status_counts.filter(m => m.status === 'Idle').length;
    const mold_is_scrapped = status_counts.filter(m => m.status === 'Scrapped').length;
    const mold_under_maintenance= status_counts.filter(m => m.status === 'Under Maintenance').length;
    
    const card_data = [
        { title: 'Total Molds', count: total },
        { title: 'Molds Available', count: available },
        { title: 'Molds In Use', count: in_use },
        { title: 'Molds Planned', count: mold_is_planned },
        {title: 'Molds Idle', count: mold_is_idle},
        {title: 'Molds Scrapped', count: mold_is_scrapped},
        {title: 'Molds Under Maintenance', count: mold_under_maintenance}

    ];

    card_data.forEach(card => {
        $(`<div class="card p-3 m-2 bg-white rounded shadow min-w-[250px]">
            <h4 class="text-gray-600 ">${card.title}</h4>
            <div class="text-lg font-bold">${card.count}</div>
        </div>`).appendTo(cards_wrapper);
    });

 		

    // Two-column layout (60-40 split)
    const two_col_wrapper = $(`<div class="m-5 row"></div>`).appendTo(page.body);
    const left_col = $(`<div class="cal-2 m-1"></div>`).appendTo(two_col_wrapper);
    const right_col = $(`<div class="cal-2 m-1"></div>`).appendTo(two_col_wrapper);

    // Mold Table
    const mold_table = $(`<div class="card p-4 mb-2 bg-white rounded shadow">
        <h4 class="text-lg font-semibold mb-2">Mold Status Table</h4>
        <table class="table table-bordered w-full">
            <thead>
                <tr>
                    <th>Mold ID</th>
                    <th>Mold Name</th>
                    <th>Status</th>
                    <th>Product Part</th>
                    <th>Mold Type</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>`).appendTo(left_col);
    async function refresh_table() {
        let filters_obj = {};

        if (filters.products_parts.get_value()) {
            filters_obj.products_parts = filters.products_parts.get_value();
        }
        if (filters.mold_type.get_value()) {
            filters_obj.mold_type = filters.mold_type.get_value();
        }
        if (filters.mold.get_value()) {
            filters_obj.name = filters.mold.get_value();
        }
        if (filters.status.get_value() && filters.status.get_value() !== 'All') {
            filters_obj.status = filters.status.get_value();
        }

        const mold_data = await frappe.db.get_list('Mold', {
            filters: filters_obj,
            fields: ['name', 'mold_name', 'mold_type', 'status','products_parts' ,'creation'],
            limit: 500
        });

        const tbody = mold_table.find('tbody');
        tbody.empty();

        if (!mold_data.length) {
            tbody.append('<tr><td colspan="5" class="text-center text-gray-500">No molds found.</td></tr>');
            return;
        }
    

    mold_data.forEach(mold => {
        mold_table.find('tbody').append(`
            <tr>
                <td>${mold.name}</td>
                <td>${mold.mold_name || ''}</td>
                <td><span class="badge ${mold.status === 'Available' ? 'badge-success' : 'badge-danger'}">${mold.status}</span></td>
                <td>${mold.products_parts || ''}</td>
                <td>${mold.mold_type || ''}</td>
                <td>${frappe.datetime.str_to_user(mold.creation)}</td>
            </tr>
        `);
    });
	}
    // Maintenance Alerts
    const maintenance_table = $(`<div class="card p-4 bg-white rounded shadow">
        <h4 class="text-lg font-semibold mb-2">Maintenance and Cleaning Alerts</h4>
        <table class="table table-bordered w-full">
            <thead>
                <tr>
                    <th>Mold ID</th>
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
        fields: ['name', 'last_maintenance_date', 'next_maintenance_due', 'current_usage_count'],
        limit: 10
    });

    alerts.forEach(row => {
        maintenance_table.find('tbody').append(`
            <tr>
                <td>${row.name}</td>
                <td>${row.last_maintenance_date || ''}</td>
                <td>${row.next_maintenance_due || ''}</td>
                <td>${row.current_usage_count || ''}</td>
                <td>
                    <button class="btn btn-xs btn-primary" onclick="frappe.set_route('Form', 'Mold Maintenance', '')">Schedule</button>
                    <button class="btn btn-xs btn-warning" onclick="frappe.set_route('Form', 'Mold', '')">Clean</button>
                </td>
            </tr>
        `);
    });

    // Quick Actions
    const quick_actions = $(`<div class="card p-4 bg-white rounded shadow">
        <h4 class="text-lg font-semibold mb-2">Quick Actions</h4>
        <ul class="space-y-2">
            <li><a class="text-blue-600 hover:underline" href="mold/new-mold-zkkmvibbqa"><i class="fa fa-plus-circle"></i> Add New Mold</a></li>
            <li><a class="text-blue-600 hover:underline" href="mold-maintenance/new-mold-maintenance-zkkmvibbqa"><i class="fa fa-calendar"></i> Schedule Maintenance</a></li>
            <li><a class="text-blue-600 hover:underline" href="mold"><i class="fa fa-chart-line"></i> Mold Performance Report</a></li>
            <li><a class="text-blue-600 hover:underline" href="mold"><i class="fa fa-broom"></i> Request Cleaning</a></li>
        </ul>
    </div>`).appendTo(right_col);
//  Initial load
    await refresh_table();

    // Refresh table on filter change
    Object.values(filters).forEach(control => {
        control.df.onchange = refresh_table;
    });

    // Optionally, add a "Refresh" button
    page.add_inner_button('Refresh Table', refresh_table);
    
};

//####################################################################################################

// frappe.pages['mold-availability-dash'].on_page_load = async function (wrapper) {
//     const page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'Mold Availability Dashboard',
//         single_column: false
//     });

//     page.set_title(__('Mold Availability Dashboard'));

//     // Filters
//     const filters_wrapper = $('<div class="flex flex-wrap gap-4 mb-4"></div>').appendTo(page.body);
//     const filters = {
//         date_range: frappe.ui.form.make_control({
//             parent: filters_wrapper,
//             df: {
//                 label: 'Date Range',
//                 fieldtype: 'DateRange',
//                 fieldname: 'date_range'
//             },
//             render_input: true
//         }),
//         products_parts: frappe.ui.form.make_control({
//             parent: filters_wrapper,
//             df: {
//                 label: 'Product Part',
//                 fieldtype: 'Link',
//                 fieldname: 'products_parts',
//                 options: 'Item'
//             },
//             render_input: true
//         }),
//         mold_type: frappe.ui.form.make_control({
//             parent: filters_wrapper,
//             df: {
//                 label: 'Mold Type',
//                 fieldtype: 'Link',
//                 options: 'Mold Type',
//                 fieldname: 'mold_type'
//             },
//             render_input: true
//         }),
//         mold: frappe.ui.form.make_control({
//             parent: filters_wrapper,
//             df: {
//                 label: 'Mold',
//                 fieldtype: 'Link',
//                 options: 'Mold',
//                 fieldname: 'mold'
//             },
//             render_input: true
//         }),
//         status: frappe.ui.form.make_control({
//             parent: filters_wrapper,
//             df: {
//                 label: 'Status',
//                 fieldtype: 'Select',
//                 options: ['All', 'Available', 'In Use', 'Under Maintenance', 'Cleaning Due'].join('\n'),
//                 fieldname: 'status'
//             },
//             render_input: true
//         }),
//     };

//     // Status cards
//     const cards_wrapper = $('<div class="flex flex-wrap gap-4 mb-6"></div>').appendTo(page.body);
//     const status_counts = await frappe.db.get_list('Mold', {
//         fields: ['status'],
//         limit: 1000
//     });

//     const total = status_counts.length;
//     const available = status_counts.filter(m => m.status === 'Available').length;
//     const in_use = status_counts.filter(m => m.status === 'In Use').length;

//     const card_data = [
//         { title: 'Total Molds', count: total },
//         { title: 'Molds Available', count: available },
//         { title: 'Molds In Use', count: in_use }
//     ];

//     card_data.forEach(card => {
//         $(`<div class="card p-4 bg-white rounded shadow min-w-[200px]">
//             <h4 class="text-gray-600 text-sm">${card.title}</h4>
//             <div class="text-lg font-bold">${card.count}</div>
//         </div>`).appendTo(cards_wrapper);
//     });

//     // Mold Table Section
//     const table_card = $(`
//         <div class="card p-4 bg-white rounded shadow w-full">
//             <h4 class="text-lg font-semibold mb-2">Mold Status Table</h4>
//             <div class="overflow-auto">
//                 <table class="table table-bordered w-full mold-table">
//                     <thead>
//                         <tr class="bg-gray-100">
//                             <th>Mold ID</th>
//                             <th>Mold Name</th>
//                             <th>Type</th>
//                             <th>Status</th>
// 							<th>Products Parts</th>
//                             <th>Last Used Date</th>
//                         </tr>
//                     </thead>
//                     <tbody></tbody>
//                 </table>
//             </div>
//         </div>
//     `).appendTo(page.body);

//     // Function to fetch and render mold data
//     async function refresh_table() {
//         let filters_obj = {};

//         if (filters.products_parts.get_value()) {
//             filters_obj.products_parts = filters.products_parts.get_value();
//         }
//         if (filters.mold_type.get_value()) {
//             filters_obj.mold_type = filters.mold_type.get_value();
//         }
//         if (filters.mold.get_value()) {
//             filters_obj.name = filters.mold.get_value();
//         }
//         if (filters.status.get_value() && filters.status.get_value() !== 'All') {
//             filters_obj.status = filters.status.get_value();
//         }

//         const mold_data = await frappe.db.get_list('Mold', {
//             filters: filters_obj,
//             fields: ['name', 'mold_name', 'mold_type', 'status','products_parts' ,'creation'],
//             limit: 500
//         });

//         const tbody = table_card.find('tbody');
//         tbody.empty();

//         if (!mold_data.length) {
//             tbody.append('<tr><td colspan="5" class="text-center text-gray-500">No molds found.</td></tr>');
//             return;
//         }

//         mold_data.forEach(row => {
//             tbody.append(`
//                 <tr>
//                     <td>${row.name}</td>
//                     <td>${row.mold_name || ''}</td>
//                     <td>${row.mold_type || ''}</td>
//                     <td>${row.status || ''}</td>
// 					<td>${row.products_parts}</td>
//                     <td>${row.creation || ''}</td>
//                 </tr>
//             `);
//         });
//     }

//     // Initial load
//     await refresh_table();

//     // Refresh table on filter change
//     Object.values(filters).forEach(control => {
//         control.df.onchange = refresh_table;
//     });

//     // Optionally, add a "Refresh" button
//     page.add_inner_button('Refresh Table', refresh_table);
// };
