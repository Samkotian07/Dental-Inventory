import Modal from "./Modal.jsx";

export default function DiscardConfirmModal({ item, onClose, onConfirm }) {
  return (
    <Modal title="Discard Exchange Record" onClose={onClose} width={420}>
      <p className="modal__lead">
        This will permanently remove <strong>{item.exchangeId}</strong> ({item.reason}) from the
        list. This can't be undone.
      </p>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button
          className="modal__btn modal__btn--danger"
          onClick={() => onConfirm(item.exchangeId)}
        >
          Discard
        </button>
      </div>
    </Modal>
  );
}
