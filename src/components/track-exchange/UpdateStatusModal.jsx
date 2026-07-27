import { useState } from "react";
import Modal from "./Modal.jsx";

const STATUS_OPTIONS = ["Pending", "Completed", "Rejected"];

export default function UpdateStatusModal({ item, onClose, onConfirm }) {
  const [status, setStatus] = useState(item.status);

  const handleConfirm = () => {
    onConfirm(item.exchangeId, status);
  };

  return (
    <Modal title="Update Exchange Status" onClose={onClose} width={420}>
      <div className="modal__field">
        <label htmlFor="exch-status">New Status</label>
        <select id="exch-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button className="modal__btn modal__btn--primary" onClick={handleConfirm}>
          Update Status
        </button>
      </div>
    </Modal>
  );
}
