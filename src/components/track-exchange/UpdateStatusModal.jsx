import { useState } from "react";
import Modal from "./Modal.jsx";

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed", "Rejected"];

export default function UpdateStatusModal({ item, onClose, onConfirm }) {
  const [status, setStatus] = useState(item.status);
  const [creditNote, setCreditNote] = useState(item.creditNote || "");
  const [newBatchNo, setNewBatchNo] = useState(item.newBatchNo || "");
  const [errorMsg, setErrorMsg] = useState("");

  const isReturn = item.type === "return" || item.type === "creditNote";
  const isExchange = item.type === "exchange";

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setErrorMsg("");
  };

  const handleConfirm = () => {
    if (status === "Completed") {
      if (isReturn && !creditNote.trim()) {
        setErrorMsg("Credit Note number is required when completing a return");
        return;
      }
      if (isExchange && !newBatchNo.trim()) {
        setErrorMsg("New Batch No (Replacement) is required when completing an exchange");
        return;
      }
    }

    onConfirm(item.returnId, status, {
      creditNote: creditNote.trim(),
      newBatchNo: newBatchNo.trim(),
    });
  };

  return (
    <Modal title="Update Status" onClose={onClose} width={420}>
      <div className="modal__field">
        <label htmlFor="ret-status">New Status</label>
        <select id="ret-status" value={status} onChange={handleStatusChange}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {status === "Completed" && isReturn && (
        <div className="modal__field credit-note-field">
          <label htmlFor="ret-credit-note">Credit Note Number *</label>
          <input
            id="ret-credit-note"
            type="text"
            placeholder="CN-2024-XXX"
            value={creditNote}
            onChange={(e) => {
              setCreditNote(e.target.value);
              setErrorMsg("");
            }}
          />
          <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            Credit Note number will be available for reference in Stock Insertion
          </p>
        </div>
      )}

      {status === "Completed" && isExchange && (
        <div className="modal__field new-batch-field">
          <label htmlFor="ret-new-batch">New Batch No (Replacement) *</label>
          <input
            id="ret-new-batch"
            type="text"
            placeholder="LOT-2024-XXX"
            value={newBatchNo}
            onChange={(e) => {
              setNewBatchNo(e.target.value);
              setErrorMsg("");
            }}
          />
          <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            Enter the replacement lot/batch number received from the manufacturer
          </p>
        </div>
      )}

      {errorMsg && (
        <p style={{ color: "#dc2626", fontSize: "13px", margin: "4px 0 10px" }}>
          {errorMsg}
        </p>
      )}

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