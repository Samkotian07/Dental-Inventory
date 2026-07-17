import { useState } from "react";
import Modal from "./Modal.jsx";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReturnItemModal({ item, onClose, onConfirm }) {
  const [returnDate, setReturnDate] = useState(todayISO());

  const handleConfirm = () => {
    onConfirm(item.issueId, returnDate);
  };

  return (
    <Modal title="Return Item" onClose={onClose} width={440}>
      <p className="modal__lead">
        Returning <strong>{item.product}</strong> ({item.refNo}) from <strong>{item.student}</strong>.
        This will add {item.qty} item(s) back to inventory.
      </p>

      <div className="modal__field">
        <label htmlFor="return-date">Return Date</label>
        <input
          id="return-date"
          type="date"
          value={returnDate}
          onChange={(e) => setReturnDate(e.target.value)}
        />
      </div>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button className="modal__btn modal__btn--primary" onClick={handleConfirm}>
          Confirm Return
        </button>
      </div>
    </Modal>
  );
}
