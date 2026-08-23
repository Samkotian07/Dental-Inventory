import { RefreshCw } from "lucide-react";
import Modal from "./Modal.jsx";
import "./ExchangeDetailsModal.css";

export default function ExchangeDetailsModal({ item, onClose }) {
  if (!item) return null;

  const statusStr = String(item.status || "Pending");

  return (
    <Modal title="Exchange Details" onClose={onClose} width={480}>
      <div className="exch-details">
        <div className="exch-details__banner">
          <span className="exch-details__icon">
            <RefreshCw size={18} strokeWidth={2.2} />
          </span>
          <div>
            <strong>{item.exchangeId || item.returnId || item.id || "—"}</strong>
            <span className={`exch-status-pill exch-status-pill--${statusStr.toLowerCase()}`}>
              {statusStr.toLowerCase()}
            </span>
          </div>
        </div>

        <div className="exch-details__grid">
          <div>
            <span>Student</span>
            <p>{item.student || item.studentName || "—"}</p>
          </div>
          <div>
            <span>Ref No</span>
            <p>{item.refNo || "—"}</p>
          </div>
          <div>
            <span>Credit Number</span>
            <p>{item.creditNo || item.creditNote || "—"}</p>
          </div>
          <div>
            <span>Date</span>
            <p>{item.date || item.returnDate || "—"}</p>
          </div>
          <div className="exch-details__grid-full">
            <span>Reason</span>
            <p>{item.reason || "—"}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
