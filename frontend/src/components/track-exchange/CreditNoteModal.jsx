import { useState, useMemo } from "react";
import Modal from "./Modal.jsx";
import { useInventory } from "../../context/InventoryContext.jsx";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function CreditNoteModal({ onClose, onConfirm }) {
  const { stock = [] } = useInventory();
  const [itemId, setItemId] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [customBatch, setCustomBatch] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [returnDate, setReturnDate] = useState(todayISO());

  const inventoryOptions = useMemo(
    () =>
      stock.map((s) => ({
        id: s.refNo || s.id,
        product: s.product || s.productName,
        batches: s.lotNo ? [s.lotNo] : [],
      })),
    [stock]
  );

  const selectedItem = inventoryOptions.find((i) => i.id === itemId);
  const availableBatches = selectedItem?.batches || [];

  const handleItemChange = (e) => {
    const id = e.target.value;
    setItemId(id);
    const item = inventoryOptions.find((i) => i.id === id);
    if (item?.batches && item.batches.length > 0) {
      setBatchNo(item.batches[0]);
    } else {
      setBatchNo("");
    }
  };

  const finalBatchNo = batchNo === "custom" ? customBatch : batchNo;
  const canSubmit = itemId && quantity > 0 && finalBatchNo.trim() && reason.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm({
      itemId,
      quantity: Number(quantity),
      batchNo: finalBatchNo.trim(),
      reason: reason.trim(),
      returnDate,
      type: "return",
    });
  };

  return (
    <Modal title="Return - To Vendor / Manufacturer" onClose={onClose} width={460}>
      <div className="modal__field">
        <label htmlFor="credit-item">Inventory Item (Ref No) *</label>
        <select id="credit-item" value={itemId} onChange={handleItemChange}>
          <option value="">Select item...</option>
          {inventoryOptions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.product} ({i.id})
            </option>
          ))}
        </select>
      </div>

      <div className="modal__field">
        <label htmlFor="credit-batch">Batch / Lot No *</label>
        {itemId && availableBatches.length > 0 ? (
          <>
            <select
              id="credit-batch"
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
            >
              {availableBatches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="custom">Other / Custom Lot...</option>
            </select>

            {batchNo === "custom" && (
              <input
                type="text"
                placeholder="Enter custom batch no..."
                style={{ marginTop: "6px" }}
                value={customBatch}
                onChange={(e) => setCustomBatch(e.target.value)}
              />
            )}
          </>
        ) : (
          <input
            id="credit-batch"
            type="text"
            placeholder="LOT-2024-001"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
          />
        )}
      </div>

      <div className="modal__field">
        <label htmlFor="credit-qty">Quantity *</label>
        <input
          id="credit-qty"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>

      <div className="modal__field">
        <label htmlFor="credit-reason">Reason for Return *</label>
        <textarea
          id="credit-reason"
          rows={3}
          placeholder="Overstock, Excess inventory, etc..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="modal__field">
        <label htmlFor="credit-date">Return Date</label>
        <input
          id="credit-date"
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