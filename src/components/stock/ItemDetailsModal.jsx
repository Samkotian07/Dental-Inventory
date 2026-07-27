import { Package } from "lucide-react";
import Modal from "./Modal.jsx";
import "./ItemDetailsModal.css";

function formatDisplayDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function ItemDetailsModal({ item, onClose }) {
  return (
    <Modal title="Item Details" onClose={onClose} width={480}>
      <div className="item-details">
        <div className="item-details__banner">
          <span className="item-details__icon">
            <Package size={18} strokeWidth={2.2} />
          </span>
          <div>
            <strong>{item.product}</strong>
            <span>{item.refNo}</span>
          </div>
        </div>

        <div className="item-details__grid">
          <div>
            <span>Category</span>
            <p>{item.category}</p>
          </div>
          <div>
            <span>Company</span>
            <p>{item.company}</p>
          </div>
          <div>
            <span>Size</span>
            <p>{item.size}</p>
          </div>
          <div>
            <span>Lot No</span>
            <p>{item.lotNo}</p>
          </div>
          <div>
            <span>Invoice No</span>
            <p>{item.invoiceNo}</p>
          </div>
          <div>
            <span>Quantity</span>
            <p>{item.qty}</p>
          </div>
          <div>
            <span>Expiry Date</span>
            <p>{formatDisplayDate(item.expiry)}</p>
          </div>
          <div>
            <span>Created</span>
            <p>{formatDisplayDate(item.created)}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
