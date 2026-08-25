import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import Modal from "./Modal.jsx";
import { FAILED_REASONS } from "../utils/constants.js";
import "./DeleteItemModal.css";

const failReasons = FAILED_REASONS;

export default function DeleteItemModal({ item, onClose, onConfirm }) {
  if (!item) return null;

  const [reason, setReason] = useState(failReasons[0] || "Damaged");
  const [moveToFailed, setMoveToFailed] = useState(true);

  const handleDelete = () => {
    onConfirm(item.refNo || item.id, { reason, moveToFailed });
  };

  return (
    <Modal title="Delete Inventory Item" onClose={onClose} width={460}>
      <div className="delete-item">
        <span className="delete-item__icon">
          <TriangleAlert size={18} strokeWidth={2.2} />
        </span>
        <p>
          Are you sure you want to delete <strong>{item.product || item.productName || "item"}</strong> ({item.refNo || item.id})? This
          action cannot be undone.
        </p>
      </div>

      <div className="modal__field">
        <label htmlFor="delete-reason">Reason</label>
        <select id="delete-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          {(failReasons || []).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <label className="delete-item__checkbox">
        <input
          type="checkbox"
          checked={moveToFailed}
          onChange={(e) => setMoveToFailed(e.target.checked)}
        />
        Move to Failed Inventory instead of permanent deletion
      </label>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button className="modal__btn modal__btn--danger" onClick={handleDelete}>
          Delete
        </button>
      </div>
    </Modal>
  );
}
