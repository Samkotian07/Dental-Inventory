import { TriangleAlert } from "lucide-react";
import Modal from "./Modal.jsx";
import "./ConfirmModals.css";

export default function DeleteStudentModal({ student, onClose, onConfirm }) {
  return (
    <Modal title="Delete Student" onClose={onClose} width={420}>
      <div className="confirm-row">
        <span className="confirm-row__icon">
          <TriangleAlert size={18} strokeWidth={2.2} />
        </span>
        <p>
          Are you sure you want to delete <strong>{student.name}</strong> ({student.campusId})?
        </p>
      </div>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button
          className="modal__btn modal__btn--danger"
          onClick={() => onConfirm(student.campusId)}
        >
          Delete
        </button>
      </div>
    </Modal>
  );
}
