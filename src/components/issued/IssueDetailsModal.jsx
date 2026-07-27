import { FileText } from "lucide-react";
import Modal from "./Modal.jsx";
import "./IssueDetailsModal.css";

export default function IssueDetailsModal({ item, onClose }) {
  return (
    <Modal title="Issue Details" onClose={onClose} width={480}>
      <div className="issue-details">
        <div className="issue-details__banner">
          <span className="issue-details__icon">
            <FileText size={18} strokeWidth={2.2} />
          </span>
          <div>
            <strong>{item.issueId}</strong>
            <span className={`status-pill status-pill--${item.status.toLowerCase()}`}>
              {item.status}
            </span>
          </div>
        </div>

        <div className="issue-details__grid">
          <div>
            <span>Student</span>
            <p>{item.student}</p>
          </div>
          <div>
            <span>Student ID</span>
            <p>{item.studentId}</p>
          </div>
          <div>
            <span>Product</span>
            <p>{item.product}</p>
          </div>
          <div>
            <span>Ref No</span>
            <p>{item.refNo}</p>
          </div>
          <div>
            <span>Lot No</span>
            <p>{item.lotNo}</p>
          </div>
          <div>
            <span>Quantity</span>
            <p>{item.qty}</p>
          </div>
          <div>
            <span>Issue Date</span>
            <p>{item.date}</p>
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
