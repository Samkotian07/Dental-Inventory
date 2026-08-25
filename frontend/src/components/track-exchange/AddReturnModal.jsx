import { useState, useMemo } from "react";
import Modal from "./Modal.jsx";
import { useInventory } from "../../context/InventoryContext.jsx";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddReturnModal({ onClose, onConfirm }) {
  const { stock = [] } = useInventory();
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [returnDate, setReturnDate] = useState(todayISO());

  const inventoryOptions = useMemo(
    () =>
      stock.map((s) => ({
        id: s.refNo || s.id,
        product: s.product || s.productName,
      })),
    [stock]
  );

  const canSubmit = itemId && quantity > 0 && reason.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm({
      itemId,
      quantity: Number(quantity),
      reason: reason.trim(),
      returnDate,
    });
  };

  return (
    <Modal title="Return to Manufacturer" onClose={onClose} width={460}>
      <div className="modal__field">
        <label htmlFor="ret-item">Inventory Item (Ref No)</label>
        <select
          id="ret-item"
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
        >
          <option value="">Select item...</option>
          {inventoryOptions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.product} ({i.id})
            </option>
          ))}
        </select>
      </div>

      <div className="modal__field">
        <label htmlFor="ret-qty">Quantity</label>
        <input
          id="ret-qty"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>

      <div className="modal__field">
        <label htmlFor="ret-reason">Reason for Return</label>
        <textarea
          id="ret-reason"
          rows={3}
          placeholder="Defective, Damaged, Expired, etc..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="modal__field">
        <label htmlFor="ret-date">Return Date</label>
        <input
          id="ret-date"
          type="date"
          value={returnDate}
          onChange={(e) => setReturnDate(e.target.value)}
        />
      </div>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button
          className="modal__btn modal__btn--primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          Create Return
        </button>
      </div>
    </Modal>
  );
}