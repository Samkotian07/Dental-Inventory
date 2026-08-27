import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/helpers';
import './Modal.css';

const SIZES = {
  sm: 'common-modal--sm',
  md: 'common-modal--md',
  lg: 'common-modal--lg',
  xl: 'common-modal--xl',
};

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="common-modal-overlay">
      <div className="common-modal-backdrop" onClick={onClose} />
      <div
        className={cn(
          'common-modal',
          SIZES[size]
        )}
      >
        <div className="common-modal__header">
          <h3>{title}</h3>
          <button
            onClick={onClose}
            className="common-modal__close"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        <div className="common-modal__body">{children}</div>
        {footer && (
          <div className="common-modal__footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
