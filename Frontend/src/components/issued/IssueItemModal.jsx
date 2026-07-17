import { useState } from "react";
import Modal from "./Modal.jsx";
import { students, inventoryOptions } from "../../data/issuedData.js";

export default function IssueItemModal({ onClose, onConfirm }) {
  const [studentId, setStudentId] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);

  const canSubmit = studentId && itemId && qty > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm({ studentId, itemId, qty: Number(qty) });
  };

  return (
    <Modal title="Issue Item" onClose={onClose} width={440}>
      <div className="modal__field">
        <label htmlFor="issue-student">Student</label>
        <select id="issue-student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Select student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.id})
            </option>
          ))}
        </select>
      </div>

      <div className="modal__field">
        <label htmlFor="issue-item">Inventory Item</label>
        <select id="issue-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
          <option value="">Select item...</option>
          {inventoryOptions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.product} ({i.id})
            </option>
          ))}
        </select>
      </div>

      <div className="modal__field">
        <label htmlFor="issue-qty">Quantity</label>
        <input
          id="issue-qty"
          type="number"
          min="1"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
      </div>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button className="modal__btn modal__btn--primary" onClick={handleSubmit} disabled={!canSubmit}>
          Issue Item
        </button>
      </div>
    </Modal>
  );
}
