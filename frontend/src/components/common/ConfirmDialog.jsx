import { AlertTriangle } from 'lucide-react';
import './ConfirmDialog.css';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  children,
}) {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="confirm-dialog-card" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-body">
          <div className={`confirm-dialog-icon-wrapper ${variant}`}>
            <AlertTriangle size={22} strokeWidth={2.2} />
          </div>
          <div className="confirm-dialog-content">
            <h3 className="confirm-dialog-title">{title}</h3>
            <p className="confirm-dialog-message">{message}</p>
            {children}
          </div>
        </div>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-btn confirm-dialog-btn-cancel" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            className={`confirm-dialog-btn confirm-dialog-btn-${variant}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
