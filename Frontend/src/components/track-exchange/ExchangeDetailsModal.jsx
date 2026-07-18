import { RefreshCw } from "lucide-react";
import Modal from "./Modal.jsx";
import "./ExchangeDetailsModal.css";

export default function ExchangeDetailsModal({ item, onClose }) {
  return (
    <Modal title="Exchange Details" onClose={onClose} width={480}>
      <div className="exch-details">
        <div className="exch-details__banner">
          <span className="exch-details__icon">
            <RefreshCw size={18} strokeWidth={2.2} />
          </span>
          <div>
            <strong>{item.exchangeId}</strong>
            <span className={`exch-status-pill exch-status-pill--${item.status.toLowerCase()}`}>
              {item.status.toLowerCase()}
            </span>
          </div>
        </div>

        <div className="exch-details__grid">
          <div>
            <span>Student</span>
            <p>{item.student}</p>
          </div>
          <div>
            <span>Ref No</span>
            <p>{item.refNo}</p>
          </div>
          <div>
            <span>Credit Number</span>
            <p>{item.creditNo}</p>
          </div>
          <div>
            <span>Date</span>
            <p>{item.date}</p>
          </div>
          <div className="exch-details__grid-full">
            <span>Reason</span>
            <p>{item.reason}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
