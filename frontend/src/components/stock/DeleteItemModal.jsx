import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal.jsx";
import { FAILED_REASONS } from "../utils/constants.js";
import "./DeleteItemModal.css";

const failReasons = FAILED_REASONS;

export default function DeleteItemModal({ item, onClose, onConfirm }) {
  if (!item) return null;

  const maxQty = Number(item.quantity ?? item.qty ?? 1);
  const [reason, setReason] = useState(failReasons[0] || "Damaged");
  const [moveQty, setMoveQty] = useState(maxQty);

  const handleMove = () => {
    const qty = Math.min(Math.max(1, Number(moveQty) || 1), maxQty);
    onConfirm(item, { reason, quantity: qty });
  };

  return (
    <Modal title="Move to Failed Inventory" onClose={onClose} width={460}>
      <div className="delete-item">
        <span className="delete-item__icon">
          <AlertTriangle size={18} strokeWidth={2.2} />
        </span>
        <p>
          Move <strong>{item.product || item.productName || "item"}</strong> ({item.refNo || item.id}) to Failed Inventory.
        </p>
      </div>

      {maxQty > 1 && (
        <div className="modal__field">
          <label htmlFor="move-qty">
            Quantity to Move (Available: {maxQty})
          </label>
          <input
            id="move-qty"
            type="number"
            min="1"
            max={maxQty}
            value={moveQty}
            onChange={(e) => setMoveQty(e.target.value)}
          />
        </div>
      )}

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

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button className="modal__btn modal__btn--danger" onClick={handleMove}>
          Move to Failed
        </button>
      </div>
    </Modal>
  );
}
