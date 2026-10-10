import { useState } from "react";
import { Plus, Minus, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";
import Modal from "./Modal.jsx";
import "./EditItemModal.css";

const PRESET_REASONS = [
  "Physical count correction",
  "Damaged in storage",
  "Audit reconciliation",
  "Shipment adjustment",
];

export default function EditItemModal({ item, onClose, onSave, onDelete, onAddLots }) {
  const currentQty = Number(item?.qty || item?.quantity || 0);
  const [qty, setQty] = useState(currentQty);
  const [reason, setReason] = useState("");
  const [newLots, setNewLots] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  if (!item) return null;

  const numQty = Number(qty);
  const unchanged = numQty === currentQty;
  const hasLots = newLots.length > 0;
  const hasValidLots = newLots.length > 0 && newLots.every((lot) =>
    lot.lotNo.trim() && Number.isFinite(Number(lot.quantity)) && Number(lot.quantity) >= 1
  );
  const canAdjust = numQty >= 1 && reason.trim().length > 0 && !unchanged;
  const canSave = !submitting && (!hasLots || hasValidLots) && (canAdjust || hasValidLots);
  const delta = numQty - currentQty;

  const handleStep = (step) => {
    setQty((prev) => Math.max(1, (Number(prev) || 0) + step));
  };

  const addLotRow = () => {
    setNewLots((lots) => [...lots, {
      lotNo: "", quantity: "", invoiceNo: "", creditNoteNo: "", expiryDate: "",
    }]);
  };

  const updateLot = (index, key, value) => {
    setNewLots((lots) => lots.map((lot, i) => i === index ? { ...lot, [key]: value } : lot));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSubmitting(true);
    let success = true;
    if (canAdjust) success = await onSave(item, { qty: numQty, reason: reason.trim() });
    if (success && hasValidLots) success = await onAddLots?.(item, newLots);
    setSubmitting(false);
    if (success) onClose();
  };

  return (
    <Modal title="Edit Inventory Item" onClose={onClose} width={780}>
      <div className="edit-stock">
        <div className="edit-stock__lot-summary">
          <span>Lot Number</span>
          <strong>{item.lotNo || "Standard"}</strong>
          <span className="edit-stock__lot-total">Current total: {currentQty} units</span>
        </div>
        {/* Quantity Stepper & Delta Card */}
        <div className="edit-stock__qty-card">
          <div className="edit-stock__qty-header">
            <label className="edit-stock__section-label">
              New Quantity *
            </label>
            {unchanged ? (
              <span className="edit-stock__delta-badge edit-stock__delta-badge--none">
                No Change
              </span>
            ) : delta > 0 ? (
              <span className="edit-stock__delta-badge edit-stock__delta-badge--inc">
                <ArrowUpRight size={12} strokeWidth={2.5} />
                +{delta} ({currentQty} → {numQty})
              </span>
            ) : (
              <span className="edit-stock__delta-badge edit-stock__delta-badge--dec">
                <ArrowDownRight size={12} strokeWidth={2.5} />
                {delta} ({currentQty} → {numQty})
              </span>
            )}
          </div>

          <div className="edit-stock__stepper-row">
            <div className="edit-stock__stepper">
              <button
                type="button"
                className="edit-stock__stepper-btn"
                onClick={() => handleStep(-1)}
                disabled={numQty <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={15} strokeWidth={2.5} />
              </button>
              <input
                type="number"
                min="1"
                className="edit-stock__stepper-input"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <button
                type="button"
                className="edit-stock__stepper-btn"
                onClick={() => handleStep(1)}
                aria-label="Increase quantity"
              >
                <Plus size={15} strokeWidth={2.5} />
              </button>
            </div>
            <span className="edit-stock__current-note">
              Currently available in stock: <strong>{currentQty}</strong>
            </span>
          </div>

          {unchanged && (
            <span className="modal__field-hint">
              Change the quantity to enable save
            </span>
          )}
        </div>

        {/* Reason Card */}
        <div className="edit-stock__reason-card">
          <label className="edit-stock__section-label">
            Reason for Adjustment *
          </label>
          <div className="edit-stock__chips">
            {PRESET_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`edit-stock__chip ${reason === preset ? "edit-stock__chip--active" : ""}`}
                onClick={() => setReason(preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          <textarea
            className="edit-stock__textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Physical count correction or reason for stock adjustment..."
            rows={3}
          />

          {!reason.trim() && (
            <span className="modal__field-hint">
              Reason is required
            </span>
          )}
        </div>

        {newLots.length > 0 && (
          <div className="edit-stock__new-lots">
            <div className="edit-stock__new-lots-header">
              <label className="edit-stock__section-label">New Items</label>
              <span>{newLots.length} lot{newLots.length === 1 ? "" : "s"}</span>
            </div>
            <div className="edit-stock__new-lots-scroll">
              {newLots.map((lot, index) => (
                <div className="edit-stock__lot-fields" key={index}>
                  <input value={lot.lotNo} onChange={(e) => updateLot(index, "lotNo", e.target.value)} placeholder="Lot no *" />
                  <input type="text" min="1" value={lot.quantity} onChange={(e) => updateLot(index, "quantity", e.target.value)} placeholder="Quantity *" />
                  <input value={lot.invoiceNo} onChange={(e) => updateLot(index, "invoiceNo", e.target.value)} placeholder="Invoice no" />
                  <input value={lot.creditNoteNo} onChange={(e) => updateLot(index, "creditNoteNo", e.target.value)} placeholder="Credit no" />
                  <input type="date" value={lot.expiryDate} onChange={(e) => updateLot(index, "expiryDate", e.target.value)} />
                  <button type="button" onClick={() => setNewLots((lots) => lots.filter((_, i) => i !== index))} aria-label="Remove item">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="modal__actions">
          {onDelete && (
            <button
              type="button"
              className="modal__btn modal__btn--danger edit-stock__delete-btn"
              onClick={onDelete}
            >
              <Trash2 size={15} strokeWidth={2.2} />
              Move to Failed
            </button>
          )}
          {onAddLots && (
            <button
              type="button"
              className="modal__btn edit-stock__add-btn"
              onClick={addLotRow}
            >
              <Plus size={15} strokeWidth={2.2} />
              Add Item
            </button>
          )}
          <button type="button" className="modal__btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="modal__btn modal__btn--primary"
            onClick={handleSave}
            disabled={!canSave}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
