import Modal from "./Modal.jsx";

export default function DiscardConfirmModal({ item, onClose, onConfirm }) {
  if (!item) return null;

  const returnId = item.returnId || item.id || "record";
  const reason = item.reason || "Return record";

  return (
    <Modal title="Discard Record" onClose={onClose} width={420}>
      <p className="modal__lead">
        This will permanently remove <strong>{returnId}</strong> ({reason}) from the
        list. This can't be undone.
      </p>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button
          className="modal__btn modal__btn--danger"
          onClick={() => onConfirm(returnId)}
        >
          Discard
        </button>
      </div>
    </Modal>
  );
}