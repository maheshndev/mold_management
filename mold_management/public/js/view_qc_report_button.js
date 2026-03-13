frappe.ui.form.on("Job Card", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			frm.add_custom_button(__("View QC Report"), () => {
				frappe.set_route("in-process-inspectio", { reference_name: frm.doc.name });
			}, __("Actions"));
		}
	}
});

frappe.ui.form.on("Daily Production Log", {
	refresh(frm) {
		if (frm.doc.docstatus < 2 && frm.doc.job_card) {
			frm.add_custom_button(__("View QC Report"), () => {
				frappe.set_route("in-process-inspectio", { reference_name: frm.doc.job_card });
			}, __("Actions"));
		}
	}
});

frappe.ui.form.on("Work Order", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			frm.add_custom_button(__("View QC Report"), () => {
				frappe.set_route("in-process-inspectio", { reference_name: frm.doc.name });
			}, __("Actions"));
		}
	}
});
