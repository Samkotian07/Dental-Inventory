import { RotateCcw } from "lucide-react";
import Modal from "./Modal.jsx";
import "./ConfirmModals.css";

export default function MoveToInventoryModal({ item, onClose, onConfirm }) {
  return (
    <Modal title="Move to Inventory" onClose={onClose} width={420}>
      <div className="confirm-row">
        <span className="confirm-row__icon confirm-row__icon--neutral">
          <RotateCcw size={18} strokeWidth={2.2} />
        </span>
        <p>
          Move <strong>{item.product}</strong> ({item.refNo}) back to active inventory?
        </p>
      </div>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button
          className="modal__btn modal__btn--primary"
          onClick={() => onConfirm(item.refNo)}
        >
          Move to Inventory
        </button>
      </div>
    </Modal>
  );
}
