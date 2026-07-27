import { useState } from "react";
import Modal from "./Modal.jsx";
import { students, inventoryOptions } from "../../data/exchangeData.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddExchangeModal({ onClose, onConfirm }) {
  const [studentId, setStudentId] = useState("");
  const [itemId, setItemId] = useState("");
  const [reason, setReason] = useState("");
  const [creditNo, setCreditNo] = useState("");
  const [date, setDate] = useState(todayISO());

  const canSubmit = studentId && itemId && reason.trim() && creditNo.trim() && date;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm({ studentId, itemId, reason: reason.trim(), creditNo: creditNo.trim(), date });
  };

  return (
    <Modal title="Add Exchange" onClose={onClose} width={460}>
      <div className="modal__field">
        <label htmlFor="exch-student">Student</label>
        <select id="exch-student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Select student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.id})
            </option>
          ))}
        </select>
      </div>

      <div className="modal__field">
        <label htmlFor="exch-item">Inventory Item (Ref No)</label>
        <select id="exch-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
          <option value="">Select item...</option>
          {inventoryOptions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.product} ({i.id})
            </option>
          ))}
        </select>
      </div>

      <div className="modal__field">
        <label htmlFor="exch-reason">Reason</label>
        <textarea
          id="exch-reason"
          rows={3}
          placeholder="Reason for exchange..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="modal__field">
        <label htmlFor="exch-credit">Credit Number</label>
        <input
          id="exch-credit"
          type="text"
          placeholder="CR-2024-XXX"
          value={creditNo}
          onChange={(e) => setCreditNo(e.target.value)}
        />
      </div>

      <div className="modal__field">
        <label htmlFor="exch-date">Exchange Date</label>
        <input id="exch-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button className="modal__btn modal__btn--primary" onClick={handleSubmit} disabled={!canSubmit}>
          Create Exchange
        </button>
      </div>
    </Modal>
  );
}
