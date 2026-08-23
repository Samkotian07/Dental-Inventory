import { FileText } from "lucide-react";
import Modal from "./Modal.jsx";
import "./IssueDetailsModal.css";

export default function IssueDetailsModal({ item, onClose }) {
  if (!item) return null;

  const statusStr = String(item.status || "Active");

  return (
    <Modal title="Issue Details" onClose={onClose} width={480}>
      <div className="issue-details">
        <div className="issue-details__banner">
          <span className="issue-details__icon">
            <FileText size={18} strokeWidth={2.2} />
          </span>
          <div>
            <strong>{item.issueId || item.id || "—"}</strong>
            <span className={`status-pill status-pill--${statusStr.toLowerCase()}`}>
              {statusStr}
            </span>
          </div>
        </div>

        <div className="issue-details__grid">
          <div>
            <span>Student</span>
            <p>{item.student || item.studentName || "—"}</p>
          </div>
          <div>
            <span>Student ID</span>
            <p>{item.studentId || "—"}</p>
          </div>
          <div>
            <span>Product</span>
            <p>{item.product || item.productName || "—"}</p>
          </div>
          <div>
            <span>Ref No</span>
            <p>{item.refNo || "—"}</p>
          </div>
          <div>
            <span>Lot No</span>
            <p>{item.lotNo || "—"}</p>
          </div>
          <div>
            <span>Quantity</span>
            <p>{item.qty ?? item.quantity ?? "—"}</p>
          </div>
          <div>
            <span>Issue Date</span>
            <p>{item.date || item.issuedDate || item.issueDate || "—"}</p>
          </div>
          <div>
            <span>Return Date</span>
            <p>{item.returnDate || "—"}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
