import { useState } from "react";
import { Package, Plus, Minus, AlertCircle, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";
import Modal from "./Modal.jsx";
import "./EditItemModal.css";

const PRESET_REASONS = [
  "Physical count correction",
  "Damaged in storage",
  "Audit reconciliation",
  "Shipment adjustment",
];

export default function EditItemModal({ item, onClose, onSave, onDelete, onAdd }) {
  if (!item) return null;

  const currentQty = Number(item?.qty || item?.quantity || 0);
  const [qty, setQty] = useState(currentQty);
  const [reason, setReason] = useState("");

  const numQty = Number(qty);
  const unchanged = numQty === currentQty;
  const canSave = numQty >= 1 && reason.trim().length > 0 && !unchanged;
  const delta = numQty - currentQty;

  const handleStep = (step) => {
    setQty((prev) => Math.max(1, (Number(prev) || 0) + step));
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave(item, { qty: numQty, reason: reason.trim() });
  };

  return (
    <Modal title="Edit Inventory Item" onClose={onClose} width={780}>
      <div className="edit-stock">
        {/* Product Banner */}
        <div className="edit-stock__banner">
          <div className="edit-stock__icon">
            <Package size={22} strokeWidth={2.2} />
          </div>
          <div className="edit-stock__info">
            <h3 className="edit-stock__title">
              {item.product || item.productName || "Unknown Product"}
            </h3>
            <div className="edit-stock__meta-tags">
              <span className="edit-stock__ref-badge">
                Ref: {item.refNo || item.id || "—"}
              </span>
              {item.category && (
                <span className={`stock-tag stock-tag--${item.category.toLowerCase()}`}>
                  {item.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Read-only Specs Grid */}
        <div className="edit-stock__meta-grid">
          <div className="edit-stock__meta-cell">
            <span className="edit-stock__meta-label">Company</span>
            <span className="edit-stock__meta-val">
              {item.company || item.companyName || "—"}
            </span>
          </div>

          <div className="edit-stock__meta-cell">
            <span className="edit-stock__meta-label">Size</span>
            <span className="edit-stock__meta-val">
              {item.size || "—"}
            </span>
          </div>

          <div className="edit-stock__meta-cell">
            <span className="edit-stock__meta-label">Current Stock</span>
            <span className="edit-stock__meta-val">
              {currentQty} unit{currentQty === 1 ? "" : "s"}
            </span>
          </div>

          <div className="edit-stock__meta-cell">
            <span className="edit-stock__meta-label">Lot Number</span>
            <span className="edit-stock__meta-val">
              {item.lotNo || "Standard"}
            </span>
          </div>
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
          {onAdd && (
            <button
              type="button"
              className="modal__btn edit-stock__add-btn"
              onClick={onAdd}
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
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
}
