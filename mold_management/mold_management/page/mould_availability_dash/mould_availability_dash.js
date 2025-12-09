// frappe.pages['mould-availability-dash'].on_page_load = async function (wrapper) {
//     const page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'Mould Availability Dashboard',
//         single_column: true,
//     });

//     const filters_wrapper = $('<div class="mx-4 flex flex-wrap gap-4 mb-4"></div>').appendTo(page.body);

//     const filters = {
//         date_range: frappe.ui.form.make_control({
//             parent: filters_wrapper,
//             df: { label: 'Date Range', fieldtype: 'DateRange' },
//             render_input: true
//         }),
//         mould_type: frappe.ui.form.make_control({
//             parent: filters_wrapper,
//             df: { label: 'Mould Type', fieldtype: 'Link', options: 'Mould Type' },
//             render_input: true
//         }),
//         mould: frappe.ui.form.make_control({
//             parent: filters_wrapper,
//             df: { label: 'Mould', fieldtype: 'Link', options: 'Mould' },
//             render_input: true
//         }),
//         status: frappe.ui.form.make_control({
//             parent: filters_wrapper,
//             df: {
//                 label: 'Status',
//                 fieldtype: 'Select',
//                 options: ['All', 'Available', 'In Use', 'Under Maintenance', 'Planned', 'Scrapped', 'Idle'].join('\n')
//             },
//             render_input: true
//         })
//     };

//     const cards_wrapper = $('<div class="mx-5 flex flex-wrap gap-4 mb-3"></div>').appendTo(page.body);

//     const two_col_wrapper = $(`<div class="m-4 row"></div>`).appendTo(page.body);
//     const left_col = $(`<div class="col-6"></div>`).appendTo(two_col_wrapper);
//     const right_col = $(`<div class="col-6"></div>`).appendTo(two_col_wrapper);

//     const mould_table = $(`<div class="card p-4 mb-2">
//         <h4>Mould Status Table</h4>
//         <table class="table table-bordered">
//             <thead>
//                 <tr>
//                     <th>Mould No</th>
//                     <th>Mould Name</th>
//                     <th>Status</th>
//                     <th>Mould Type</th>
//                     <th>Location</th>
//                 </tr>
//             </thead>
//             <tbody></tbody>
//         </table>
//     </div>`).appendTo(left_col);

//     async function refresh_table() {
//         let filters_obj = {};

//         if (filters.mould_type.get_value()) filters_obj.mould_type = filters.mould_type.get_value();
//         if (filters.mould.get_value()) filters_obj.name = filters.mould.get_value();
//         if (filters.status.get_value() && filters.status.get_value() !== 'All') filters_obj.status = filters.status.get_value();

//         if (filters.date_range.get_value()) {
//             const dates = filters.date_range.get_value().split(" to ");
//             if (dates.length === 2) {
//                 filters_obj.last_maintenance_date = ['between', dates];
//             }
//         }

//         const mould_data = await frappe.db.get_list('Mould', {
//             filters: filters_obj,
//             fields: ['name', 'mould_no', 'mould_name', 'mould_type', 'status', 'location'],
//             limit: 1000
//         });

//         cards_wrapper.empty();

//         const counts = mould_data.reduce((acc, m) => {
//             acc.total++;
//             acc[m.status] = (acc[m.status] || 0) + 1;
//             return acc;
//         }, { total: 0 });

//         Object.entries(counts).forEach(([key, val]) => {
//             $(`<div class="card p-3 m-2"><h5>${key}</h5><b>${val}</b></div>`).appendTo(cards_wrapper);
//         });

//         const tbody = mould_table.find('tbody');
//         tbody.empty();

//         mould_data.forEach(mould => {
//             let badge = 'badge-secondary';
//             if (mould.status === 'Available') badge = 'badge-success';
//             if (mould.status === 'In Use') badge = 'badge-warning';
//             if (mould.status === 'Under Maintenance') badge = 'badge-danger';

//             tbody.append(`
//                 <tr>
//                     <td>${mould.mould_no}</td>
//                     <td>${mould.mould_name || ''}</td>
//                     <td><span class="badge ${badge}">${mould.status}</span></td>
//                     <td>${mould.mould_type || ''}</td>
//                     <td>${mould.location || ''}</td>
//                 </tr>
//             `);
//         });
//     }

//     await refresh_table();
//     Object.values(filters).forEach(control => {
//         control.$input.on('change', refresh_table);
//     });

//     page.add_inner_button('Refresh Table', refresh_table);
// };



frappe.pages['mould-availability-dash'].on_page_load = async function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Mould Availability Dashboard',
        single_column: true,
    });

    // -------------------------------
    // ✅ FILTER SECTION (WITH SPACING)
    // -------------------------------
    const filters_wrapper = $(`
        <div class="m-4 d-flex flex-wrap align-items-end" style="gap:25px"></div>
    `).appendTo(page.body);

    const filters = {
        date_range: frappe.ui.form.make_control({
            parent: filters_wrapper,
            df: { label: 'Date Range', fieldtype: 'DateRange' },
            render_input: true
        }),
        mould_type: frappe.ui.form.make_control({
            parent: filters_wrapper,
            df: { label: 'Mould Type', fieldtype: 'Link', options: 'Mould Type' },
            render_input: true
        }),
        mould: frappe.ui.form.make_control({
            parent: filters_wrapper,
            df: { label: 'Mould', fieldtype: 'Link', options: 'Mould' },
            render_input: true
        }),
        status: frappe.ui.form.make_control({
            parent: filters_wrapper,
            df: {
                label: 'Status',
                fieldtype: 'Select',
                options: ['All', 'Available', 'In Use', 'Under Maintenance', 'Planned', 'Scrapped', 'Idle'].join('\n')
            },
            render_input: true
        })
    };

    // -------------------------------
    // ✅ CARD WRAPPER
    // -------------------------------
    const cards_wrapper = $('<div class="mx-4 d-flex flex-wrap"></div>').appendTo(page.body);

    // -------------------------------
    // ✅ TWO COLUMN LAYOUT
    // -------------------------------
    const two_col_wrapper = $(`<div class="row m-4"></div>`).appendTo(page.body);
    const left_col = $(`<div class="col-8"></div>`).appendTo(two_col_wrapper);
    const right_col = $(`<div class="col-4"></div>`).appendTo(two_col_wrapper);

    // -------------------------------
    // ✅ MOULD STATUS TABLE
    // -------------------------------
    const mould_table = $(`<div class="card p-4 mb-3">
        <h4 class="mb-3">Mould Status Table</h4>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Mould No</th>
                    <th>Mould Name</th>
                    <th>Status</th>
                    <th>Mould Type</th>
                    <th>Location</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>`).appendTo(left_col);

    // -------------------------------
    // ✅ REFRESH FUNCTION
    // -------------------------------
    async function refresh_table() {
        let filters_obj = {};

        if (filters.mould_type.get_value())
            filters_obj.mould_type = filters.mould_type.get_value();

        if (filters.mould.get_value())
            filters_obj.name = filters.mould.get_value();

        if (filters.status.get_value() && filters.status.get_value() !== 'All')
            filters_obj.status = filters.status.get_value();

        if (filters.date_range.get_value()) {
            const dates = filters.date_range.get_value().split(" to ");
            if (dates.length === 2) {
                filters_obj.last_maintenance_date = ['between', dates];
            }
        }

        const mould_data = await frappe.db.get_list('Mould', {
            filters: filters_obj,
            fields: ['name', 'mould_code', 'mould_name', 'mould_type', 'status', 'location'],
            limit: 1000
        });

        // ✅ UPDATE CARDS
        cards_wrapper.empty();
        const counts = mould_data.reduce((acc, m) => {
            acc.total++;
            acc[m.status] = (acc[m.status] || 0) + 1;
            return acc;
        }, { total: 0 });

        // const card_definitions = [
        //     { title: "Total", value: counts.total,  bg: "#f1f3f5", color: "#000" },
        //     { title: "Idle", value: counts['Idle'] || 0, bg: "#e2e3e5", color: "#383d41" },
        //     { title: "In Use", value: counts['In Use'] || 0, bg: "#fff3cd", color: "#856404" },
        //     { title: "Available", value: counts['Available'] || 0, bg: "#d4edda", color: "#155724" },
        //     { title: "Under Maintenance", value: counts['Under Maintenance'] || 0, bg: "#f8d7da", color: "#721c24" },
        //     { title: "Scrapped", value: counts['Scrapped'] || 0, bg: "#e0e0e0", color: "#333" },
        //     { title: "Planned", value: counts['Planned'] || 0, bg: "#d1ecf1", color: "#0c5460"  },
        // ];

    const card_definitions = [
        { title: "Total", value: counts.total, bg: "#f1f3f5", color: "#000" },

        { title: "Idle", value: counts['Idle'] || 0,  bg: "#e3f2fd", color: "#0d47a1" },        // Light Grey
        { title: "In Use", value: counts['In Use'] || 0,  bg: "#fff8e1", color: "#ff6f00" },    // Light Yellow
        { title: "Available", value: counts['Available'] || 0, bg: "#e8f5e9", color: "#1b5e20" }, // Light Green
        { title: "Under Maintenance", value: counts['Under Maintenance'] || 0,bg: "#fdecea", color: "#b71c1c" }, // Light Red
        { title: "Scrapped", value: counts['Scrapped'] || 0, bg: "#eeeeee", color: "#424242" },   // Light Dark
        { title: "Planned", value: counts['Planned'] || 0, bg: "#d6e1e0ff", color: "#004d40" },  // Light Cyan
    ];

        cards_wrapper.empty();

        card_definitions.forEach(card => {
            $(`
                <div class="card p-3 m-2 text-center"
                    style="
                        min-width:160px;
                        background:${card.bg};
                        border:1px solid rgba(0,0,0,0.1);
                        border-radius:12px;
                    ">
                    <div style="font-size:14px; color:${card.color}; font-weight:600;">
                        ${card.title}
                    </div>
                    <div style="font-size:32px; font-weight:700; color:${card.color};">
                        ${card.value}
                    </div>
                </div>
            `).appendTo(cards_wrapper);
        });

        

        // card_definitions.forEach(card => {
        //     $(`<div class="card p-3 m-2 text-center" style="min-width:160px">
        //         <div style="font-size:14px;color:#666">${card.title}</div>
        //         <div style="font-size:32px;font-weight:700">${card.value}</div>
        //     </div>`).appendTo(cards_wrapper);
        // });

        // ✅ UPDATE TABLE
        const tbody = mould_table.find('tbody');
        tbody.empty();

        mould_data.forEach(mould => {
            let badge = 'badge-secondary';
                if (mould.status === 'Available') badge = 'badge-success';       // BLUE
                if (mould.status === 'In Use') badge = 'badge-info';             // LIGHT BLUE
                if (mould.status === 'Under Maintenance') badge = 'badge-danger'; // RED
                if (mould.status === 'Planned') badge = 'badge-warning';         // YELLOW
                if (mould.status === 'Idle') badge = 'badge-dark';               // BLACK
                if (mould.status === 'Scrapped') badge = 'badge-secondary';      // GREY

            tbody.append(`
                <tr>
                    <td>${mould.mould_code || ''}</td>
                    <td>${mould.mould_name || ''}</td>
                    <td><span class="badge ${badge}">${mould.status}</span></td>
                    <td>${mould.mould_type || ''}</td>
                    <td>${mould.location || ''}</td>
                </tr>
            `);
        });
    }

    // -------------------------------
    // ✅ MAINTENANCE ALERTS
    // -------------------------------
    const maintenance_table = $(`<div class="card p-4 mb-3">
        <h4 class="mb-3">Maintenance Alerts</h4>
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Mould</th>
                    <th>Last Maintenance</th>
                    <th>Next Due</th>
                    <th>Usage Count</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>`).appendTo(left_col);

    const alerts = await frappe.db.get_list('Mould', {
        fields: ['name', 'mould_name', 'mould_code', 'last_maintenance_date', 'next_maintenance_due', 'current_usage_count'],
        limit: 10
    });

    alerts.forEach(row => {
        maintenance_table.find('tbody').append(`
            <tr>
                <td>${row.mould_code || ''}</td>
                <td>${row.last_maintenance_date || ''}</td>
                <td>${row.next_maintenance_due || ''}</td>
                <td>${row.current_usage_count || ''}</td>
                <td>
                    
                    <button class="btn btn-xs btn-warning schedule-btn" style="background-color:#FFE52A;  border:1px solid #1B211A;"
                     data-mould-code="${row.mould_code}">
                        Schedule
                    </button>

                </td>
            </tr>
        `);
    });

    // maintenance_table.find('.schedule-btn').on('click', function () {
    //     const mouldName = $(this).data('name');

    //     frappe.call({
    //         method: "frappe.client.insert",
    //         args: {
    //             doc: {
    //                 doctype: "Mould Maintenance",
    //                 mould: mouldName
    //             }
    //         },
    //         callback: function (r) {
    //             if (r.message) {
    //                 frappe.msgprint("Maintenance Created");
    //                 frappe.set_route("Form", "Mould Maintenance", r.message.name);
    //             }
    //         }
    //     });
    // });

    maintenance_table.find('.schedule-btn').on('click', function () {

    const mouldCode = $(this).data('mould-code');

    // ✅ Pass value to next form
    frappe.route_options = {
        mould_name: mouldCode
    };

    // ✅ Redirect to NEW Mould Maintenance form (NO SAVE)
    frappe.set_route('Form', 'Mould Maintenance', 'new');

    });


    // -------------------------------
    // ✅ QUICK ACTIONS PANEL (RESTORED)
    // -------------------------------
    const quick_actions = $(`
        <div class="card p-4">
            <h4 class="mb-3">Quick Actions</h4>
            <ul style="line-height:2">
                <li><a class="text-primary" href="/app/mould/new">➕ Add New Mould</a></li>
                <li><a class="text-primary" href="/app/mould-maintenance/new">📅 Schedule Maintenance</a></li>
                <li><a class="text-primary" >📊 Mould Performance Report</a></li>
                <li><a class="text-primary" >🧹 Request Cleaning</a></li>
            </ul>
        </div>
    `).appendTo(right_col);

    // -------------------------------
    // ✅ INITIAL LOAD + FILTER EVENTS
    // -------------------------------
    await refresh_table();

    Object.values(filters).forEach(control => {
        control.$input.on('change', refresh_table);
    });

    page.add_inner_button('Refresh Table', refresh_table);
};


