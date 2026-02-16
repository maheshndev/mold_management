frappe.ui.form.on("Work Order", {
  refresh(frm) {
    apply_mould_filter(frm)
  },

  production_item(frm) {
    frm.set_value("mould", null)
    apply_mould_filter(frm)
  },

  is_moulding(frm) {
    frm.set_value("mould", null)
    apply_mould_filter(frm)
  }
})

function apply_mould_filter(frm) {
  // If not moulding or no item → block mould field
  if (!frm.doc.is_moulding || !frm.doc.production_item) {
    frm.set_query("mould", () => ({
      filters: { name: ["=", "__no_value__"] }
    }))
    return
  }

  // Fetch Item including child table
  frappe.call({
    method: "frappe.client.get",
    args: {
      doctype: "Item",
      name: frm.doc.production_item
    },
    callback(r) {
      if (!r.message) return

      // 👇 CHANGE fieldname if different
      const table = r.message.mould_selection_table || []

      const moulds = table
        .map(row => row.mould_no)
        .filter(Boolean)

      if (!moulds.length) {
        frm.set_query("mould", () => ({
          filters: { name: ["=", "__no_value__"] }
        }))
        return
      }

      frm.set_query("mould", () => ({
        filters: {
          name: ["in", moulds]
        }
      }))
    }
  })
}
