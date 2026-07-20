frappe.pages['sales_order_tabs'].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Sales Order Tabs',
        single_column: true
    });

    // -------------------------------
    // SECTION 1: Sales Orders + Filters
    // -------------------------------
    let section1 = `
        <div class="card p-3 mb-4">
            <h4>Section 1: Sales Orders</h4>
            
            <!-- Filters -->
            <div class="row mb-3">
                <div class="col-md-4">
                    <input type="text" class="form-control" id="filter_customer" placeholder="Filter by Customer">
                </div>
                <div class="col-md-3">
                    <input type="date" class="form-control" id="filter_from_date">
                </div>
                <div class="col-md-3">
                    <input type="date" class="form-control" id="filter_to_date">
                </div>
                <div class="col-md-2">
                    <button class="btn btn-primary btn-block" id="apply_filters">Apply</button>
                </div>
            </div>

            <ul class="nav nav-tabs" id="section1-tabs" role="tablist">
                <li class="nav-item">
                    <a class="nav-link active" id="sales-orders-tab" data-target="#sales-orders" href="javascript:void(0)" role="tab">Sales Orders</a>
                </li>
            </ul>
            <div class="tab-content mt-3">
                <div class="tab-pane fade show active" id="sales-orders" role="tabpanel"></div>
            </div>
        </div>
    `;

    // -------------------------------
    // SECTION 2: BOM Details
    // -------------------------------
    let section2 = `
        <div class="card p-3">
            <h4>Section 2: BOM Details</h4>
            <ul class="nav nav-tabs" id="section2-tabs" role="tablist">
                <li class="nav-item">
                    <a class="nav-link active" id="bom-items-tab" data-target="#bom-items" href="javascript:void(0)" role="tab">BOM Items</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" id="bom-raw-tab" data-target="#bom-raw" href="javascript:void(0)" role="tab">BOM Raw Materials</a>
                </li>
            </ul>
            <div class="tab-content mt-3">
                <div class="tab-pane fade show active" id="bom-items" role="tabpanel"></div>
                <div class="tab-pane fade" id="bom-raw" role="tabpanel"></div>
            </div>
        </div>
    `;

    $(page.body).append(section1 + section2);

    // containers
    let salesOrderContainer = $("#sales-orders");
    let bomItemsContainer = $("#bom-items");
    let bomRawContainer = $("#bom-raw");

    // -------------------------------
    // Helpers
    // -------------------------------
    function showLoader($container, message = "Loading...") {
        $container.html(`
            <div class="d-flex align-items-center text-muted">
                <div class="spinner-border spinner-border-sm mr-2" role="status"></div>
                <span>${message}</span>
            </div>
        `);
    }

    function showNoRecords($container, message) {
        $container.html(`<p class="text-muted">${message}</p>`);
    }

    // Handle tab switching → just show/hide, do not clear content
    page.wrapper.on('click', 'a[data-target]', function (e) {
        e.preventDefault();
        let $a = $(this);
        let targetSelector = $a.data('target');

        $a.closest('ul.nav').find('a.nav-link').removeClass('active');
        $a.addClass('active');

        let $tabContent = $a.closest('.card').find('.tab-content .tab-pane');
        $tabContent.removeClass('show active');
        $(targetSelector).addClass('show active');
    });

    // -------------------------------
    // Load Sales Orders
    // -------------------------------
    function load_sales_orders(filters = {}) {
        showLoader(salesOrderContainer, "Loading Sales Orders...");
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Sales Order",
                fields: ["name", "customer_name", "transaction_date", "status"],
                filters: filters,
                limit_page_length: 20,
                order_by: "creation desc"
            },
            callback: function (r) {
                if (r.message && r.message.length) {
                    let rows = r.message.map(d => `
                        <tr data-so="${d.name}">
                            <td>${d.name}</td>
                            <td>${d.customer_name}</td>
                            <td>${d.transaction_date}</td>
                            <td>${d.status}</td>
                        </tr>
                    `).join("");

                    salesOrderContainer.html(`
                        <table class="table table-bordered table-hover">
                            <thead>
                                <tr>
                                    <th>Sales Order</th>
                                    <th>Customer</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    `);
                } else {
                    showNoRecords(salesOrderContainer, "No Sales Orders found.");
                }
            }
        });
    }

    // -------------------------------
    // Filters
    // -------------------------------
    page.wrapper.on('click', '#apply_filters', function () {
        let customer = $("#filter_customer").val();
        let from_date = $("#filter_from_date").val();
        let to_date = $("#filter_to_date").val();

        let filters = {};
        if (customer) filters["customer_name"] = ["like", "%" + customer + "%"];
        if (from_date && to_date) filters["transaction_date"] = ["between", [from_date, to_date]];
        else if (from_date) filters["transaction_date"] = [">=", from_date];
        else if (to_date) filters["transaction_date"] = ["<=", to_date];

        load_sales_orders(filters);
    });

    // Initial load
    load_sales_orders();

    // -------------------------------
    // Load BOM Items
    // -------------------------------
    function load_bom_items(sales_order) {
        showLoader(bomItemsContainer, `Loading BOM items for ${sales_order}...`);
        // don't clear bomRawContainer here → old raw materials stay until a new BOM is clicked

        frappe.call({
            method: "frappe.client.get",
            args: { doctype: "Sales Order", name: sales_order },
            callback: function (res) {
                if (res.message && res.message.items && res.message.items.length) {
                    let rows = res.message.items.map(i => `
                        <tr data-bom="${i.bom_no || ''}">
                            <td>${i.item_code}</td>
                            <td>${i.item_name}</td>
                            <td>${i.qty}</td>
                            <td>${i.rate}</td>
                            <td>${i.amount}</td>
                            <td>${i.bom_no || ''}</td>
                        </tr>
                    `).join("");

                    bomItemsContainer.html(`
                        <h5>BOM Items for ${sales_order}</h5>
                        <table class="table table-bordered table-hover">
                            <thead>
                                <tr>
                                    <th>Item Code</th>
                                    <th>Item Name</th>
                                    <th>Qty</th>
                                    <th>Rate</th>
                                    <th>Amount</th>
                                    <th>BOM No</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    `);
                } else {
                    showNoRecords(bomItemsContainer, "No BOM items found for this Sales Order.");
                }
            }
        });
    }

    // -------------------------------
    // Load BOM Raw Materials
    // -------------------------------
    function load_bom_raw_materials(bom_no) {
        showLoader(bomRawContainer, `Loading raw materials for BOM: ${bom_no}...`);
        frappe.call({
            method: "frappe.client.get",
            args: { doctype: "BOM", name: bom_no },
            callback: function (res) {
                if (res.message && res.message.items && res.message.items.length) {
                    let rows = res.message.items.map(i => `
                        <tr>
                            <td>${i.item_code}</td>
                            <td>${i.item_name}</td>
                            <td>${i.qty}</td>
                            <td>${i.rate}</td>
                            <td>${i.amount || ''}</td>
                        </tr>
                    `).join("");

                    bomRawContainer.html(`
                        <h5>Raw Materials for BOM: ${bom_no}</h5>
                        <table class="table table-bordered table-hover">
                            <thead>
                                <tr>
                                    <th>Item Code</th>
                                    <th>Item Name</th>
                                    <th>Qty</th>
                                    <th>Rate</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    `);
                } else {
                    showNoRecords(bomRawContainer, "No raw materials found for this BOM.");
                }
            }
        });
    }

    // -------------------------------
    // Events
    // -------------------------------
    page.wrapper.on('click', '#sales-orders tbody tr', function () {
        let so = $(this).data("so");
        if (so) {
            load_bom_items(so);
            $('#bom-items-tab').trigger('click'); // switch tab
        }
    });

    page.wrapper.on('click', '#bom-items tbody tr', function () {
        let bom_no = $(this).data("bom");
        if (bom_no) {
            load_bom_raw_materials(bom_no);
            $('#bom-raw-tab').trigger('click'); // switch tab
        }
    });
};
