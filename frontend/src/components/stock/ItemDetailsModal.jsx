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
  if (!item) return null;

  const invoice =
    item.invoiceNo ||
    item.invoiceNumber ||
    item.documentNumber ||
    item.document_number ||
    item.creditNoteNo ||
    "—";

  const createdDate = item.created || item.createdAt || item.created_at;

  return (
    <Modal title="Item Details" onClose={onClose} width={480}>
      <div className="item-details">
        <div className="item-details__banner">
          <span className="item-details__icon">
            <Package size={18} strokeWidth={2.2} />
          </span>
          <div>
            <strong>{item.product || item.productName || "—"}</strong>
            <span>{item.refNo || item.id || "—"}</span>
          </div>
        </div>

        <div className="item-details__grid">
          <div>
            <span>Category</span>
            <p>{item.category || "—"}</p>
          </div>
          <div>
            <span>Company</span>
            <p>{item.company || item.companyName || "—"}</p>
          </div>
          <div>
            <span>Size</span>
            <p>{item.size || "—"}</p>
          </div>
          <div>
            <span>Lot No</span>
            <p>{item.lotNo || item.lot_no || "—"}</p>
          </div>
          <div>
            <span>Invoice No</span>
            <p>{invoice}</p>
          </div>
          <div>
            <span>Quantity</span>
            <p>{item.qty ?? item.quantity ?? "—"}</p>
          </div>
          <div>
            <span>Expiry Date</span>
            <p>{formatDisplayDate(item.expiry || item.expiryDate || item.expiry_date)}</p>
          </div>
          <div>
            <span>Created</span>
            <p>{formatDisplayDate(createdDate)}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
