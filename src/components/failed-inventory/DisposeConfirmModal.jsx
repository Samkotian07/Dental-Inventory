import { TriangleAlert } from "lucide-react";
import Modal from "./Modal.jsx";
import "./ConfirmModals.css";

export default function DisposeConfirmModal({ item, onClose, onConfirm }) {
  return (
    <Modal title="Mark as Disposed" onClose={onClose} width={420}>
      <div className="confirm-row">
        <span className="confirm-row__icon">
          <TriangleAlert size={18} strokeWidth={2.2} />
        </span>
        <p>
          Mark <strong>{item.product}</strong> ({item.refNo}) as disposed? This is a permanent
          action.
        </p>
      </div>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button className="modal__btn modal__btn--danger" onClick={() => onConfirm(item.refNo)}>
          Mark Disposed
        </button>
      </div>
    </Modal>
  );
}
