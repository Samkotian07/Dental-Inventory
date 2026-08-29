import { useState } from "react";
import Modal from "./Modal.jsx";

export default function UpdateStatusModal({ item, onClose, onConfirm }) {
  const [newStatus, setNewStatus] = useState(item.status || "Pending");
  const [newBatchNo, setNewBatchNo] = useState(item.newBatchNo || "");
  const [creditNote, setCreditNote] = useState(item.creditNote || "");

  const isExchange = item.type === "exchange";
  const isCreditNote = item.type === "creditNote" || item.type === "return";
  const showBatchField = isExchange && newStatus === "Completed";
  const showCreditNoteField = isCreditNote && newStatus === "Completed";

  const handleConfirm = () => {
    const extraData = {};
    
    if (isExchange && newStatus === "Completed") {
      if (!newBatchNo.trim()) {
        alert("Please enter the new batch number for exchange completion");
        return;
      }
      extraData.newBatchNo = newBatchNo.trim();
    }
    
    if (isCreditNote && newStatus === "Completed") {
      if (!creditNote.trim()) {
        alert("Please enter the credit note number");
        return;
      }
      extraData.creditNote = creditNote.trim();
    }
    
    onConfirm(item.returnId, newStatus, extraData);
  };

  const statusOptions = ["Pending", "In Progress", "Completed", "Rejected"];

  return (
    <Modal title="Update Return Status" onClose={onClose} width={480}>
      <div className="modal__field">
        <label htmlFor="status-update">Current Return</label>
        <p style={{ fontSize: "14px", color: "#475569", margin: "4px 0 12px" }}>
          {item.productName} ({item.refNo}) - {item.type === "exchange" ? "Exchange" : "Credit Note"}
        </p>
        <label htmlFor="status-update">New Status</label>
        <select
          id="status-update"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #D1D5DB",
            fontSize: "14px",
            background: "white",
          }}
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {showBatchField && (
        <div className="modal__field">
          <label htmlFor="new-batch">New Batch Number *</label>
          <input
            id="new-batch"
            type="text"
            value={newBatchNo}
            onChange={(e) => setNewBatchNo(e.target.value)}
            placeholder="Enter the new batch number from vendor"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #D1D5DB",
              fontSize: "14px",
            }}
          />
          <small style={{ color: "#6B7280", marginTop: "4px", display: "block" }}>
            This will create a new inventory item with the new batch number
          </small>
        </div>
      )}

      {showCreditNoteField && (
        <div className="modal__field">
          <label htmlFor="credit-note">Credit Note Number *</label>
          <input
            id="credit-note"
            type="text"
            value={creditNote}
            onChange={(e) => setCreditNote(e.target.value)}
            placeholder="Enter the credit note number"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #D1D5DB",
              fontSize: "14px",
            }}
          />
        </div>
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