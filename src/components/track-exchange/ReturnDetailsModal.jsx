import { FileText, Repeat } from "lucide-react";
import Modal from "./Modal.jsx";
import "./ReturnDetailsModal.css";

export default function ReturnDetailsModal({ item, onClose }) {
  if (!item) return null;

  const isExchange = item.type === "exchange";
  const returnedBatch = item.batchNo || item.oldBatchNo || "—";

  return (
    <Modal title="Return Details" onClose={onClose} width={480}>
      <div className="ret-details">
        <div className="ret-details__banner">
          <span className="ret-details__icon">
            {isExchange ? <Repeat size={18} strokeWidth={2.2} /> : <FileText size={18} strokeWidth={2.2} />}
          </span>
          <div>
            <strong>{item.returnId}</strong>
            <span className={`ret-status-pill ret-status-pill--${item.status.toLowerCase().replace(/\s+/g, "-")}`}>
              {item.status.toLowerCase()}
            </span>
          </div>
        </div>

        <div className="ret-details__grid">
          <div>
            <span>Type</span>
            <p className="ret-details__type">
              {isExchange ? "🔄 Exchange" : "📄 Return"}
            </p>
          </div>
          <div>
            <span>Ref No</span>
            <p>{item.refNo}</p>
          </div>
          <div>
            <span>Product</span>
            <p>{item.productName}</p>
          </div>
          <div>
            <span>Quantity</span>
            <p>{item.quantity}</p>
          </div>

          <div>
            <span>Batch / Lot No</span>
            <p className="ret-details__batch">{returnedBatch}</p>
          </div>

          {isExchange ? (
            <div>
              <span>New Batch No (Replacement)</span>
              <p className="ret-details__batch ret-details__new-batch">
                {item.newBatchNo || <em style={{ color: "#9ca3af" }}>Pending replacement</em>}
              </p>
            </div>
          ) : (
            <div>
              <span>Credit Note</span>
              <p className="ret-details__credit-note">
                {item.creditNote || <em style={{ color: "#9ca3af" }}>Pending completion</em>}
              </p>
            </div>
          )}

          <div>
            <span>Return Date</span>
            <p>{item.returnDate}</p>
          </div>
          <div className="ret-details__grid-full">
            <span>Reason</span>
            <p>{item.reason}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}