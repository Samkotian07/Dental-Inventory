import { X } from "lucide-react";
import "./Modal.css";

export default function Modal({ title, onClose, children, width = 420 }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal__panel" style={{ maxWidth: width }}>
        <div className="modal__head">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
