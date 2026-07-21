import { useState } from "react";
import Modal from "./Modal.jsx";
import { categories } from "../../data/stockData.js";

const editableCategories = categories.filter((c) => c !== "All Categories");

export default function EditItemModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    category: item.category,
    company: item.company,
    product: item.product,
    size: item.size,
    lotNo: item.lotNo,
    qty: item.qty,
    expiry: item.expiry || "",
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    onSave(item.refNo, { ...form, qty: Number(form.qty) });
  };

  return (
    <Modal title="Edit Inventory Item" onClose={onClose} width={520}>
      <div className="modal__field-row">
        <div className="modal__field">
          <label htmlFor="edit-category">Category</label>
          <select id="edit-category" value={form.category} onChange={set("category")}>
            {editableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="modal__field">
          <label htmlFor="edit-company">Company Name</label>
          <input id="edit-company" type="text" value={form.company} onChange={set("company")} />
        </div>
      </div>

      <div className="modal__field-row">
        <div className="modal__field">
          <label htmlFor="edit-product">Product Name</label>
          <input id="edit-product" type="text" value={form.product} onChange={set("product")} />
        </div>

        <div className="modal__field">
          <label htmlFor="edit-size">Size</label>
          <input id="edit-size" type="text" value={form.size} onChange={set("size")} />
        </div>
      </div>

      <div className="modal__field-row">
        <div className="modal__field">
          <label htmlFor="edit-lot">Lot No</label>
          <input id="edit-lot" type="text" value={form.lotNo} onChange={set("lotNo")} />
        </div>

        <div className="modal__field">
          <label htmlFor="edit-qty">Quantity</label>
          <input id="edit-qty" type="number" min="0" value={form.qty} onChange={set("qty")} />
        </div>
      </div>

      <div className="modal__field">
        <label htmlFor="edit-expiry">Expiry Date</label>
        <input id="edit-expiry" type="date" value={form.expiry} onChange={set("expiry")} />
      </div>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button className="modal__btn modal__btn--primary" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </Modal>
  );
}
