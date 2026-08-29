import { useState } from "react";
import { Package, History, ChevronDown, ChevronUp } from "lucide-react";
import Modal from "./Modal.jsx";
import { useInventory } from "../../context/InventoryContext.jsx";
import "./ItemDetailsModal.css";

function formatDisplayDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function UnitHistoryPreview({ unitId }) {
  const { issuedItems } = useInventory();
  const [expanded, setExpanded] = useState(false);

  const history = (issuedItems || [])
    .filter(i => i.unitId === unitId)
    .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));

  if (history.length === 0) {
    return <span className="unit-history-empty">No history</span>;
  }

  const latest = history[0];

  return (
    <div className="unit-history-preview">
      <div className="unit-history-summary" onClick={() => setExpanded(!expanded)}>
        <span>
          Last: <strong>{latest.student}</strong> ({formatDisplayDate(latest.issueDate)})
          {latest.status === 'Returned' && ' ✅ Returned'}
          {latest.status === 'Active' && ' 🔄 Current'}
          {latest.status === 'Condemned' && ' ❌ Condemned'}
        </span>
        <button className="unit-history-toggle">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {expanded && (
        <div className="unit-history-list">
          {history.map((h, idx) => (
            <div key={h.issueId} className="unit-history-item">
              <span className="unit-history-cycle">#{history.length - idx}</span>
              <span className="unit-history-student">{h.student}</span>
              <span className="unit-history-date">{formatDisplayDate(h.issueDate)}</span>
              <span className={`unit-history-status status-${h.status.toLowerCase()}`}>
                {h.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ItemDetailsModal({ item, onClose }) {
  if (!item) return null;

  const { stock = [] } = useInventory();

  // Find all units for this product
  const productUnits = stock.filter(s => {
    const rawRef = s.refNo || s.id || "";
    const baseRef = /^[A-Z0-9]+-[0-9]+[A-Z]$/i.test(rawRef) ? rawRef.slice(0, -1) : rawRef;
    return baseRef === item.refNo || s.refNo === item.refNo;
  });

  const invoice =
    item.invoiceNo ||
    item.invoiceNumber ||
    item.documentNumber ||
    item.document_number ||
    item.creditNoteNo ||
    "—";

  const createdDate = item.created || item.createdAt || item.created_at;

  return (
    <Modal title="Item Details" onClose={onClose} width={580}>
      <div className="item-details">
        {/* Product Banner */}
        <div className="item-details__banner">
          <span className="item-details__icon">
            <Package size={18} strokeWidth={2.2} />
          </span>
          <div>
            <strong>{item.product || item.productName || "—"}</strong>
            <span>{item.refNo || item.id || "—"}</span>
          </div>
        </div>

        {/* Product Details Grid */}
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
          <div>
            <span>Returned Units</span>
            <p>{productUnits.filter(u => u.isReturned === true).length}</p>
          </div>
        </div>

        {/* Units List */}
        {productUnits.length > 0 && (
          <div className="item-details__units">
            <h4>📦 Individual Units ({productUnits.length})</h4>
            <div className="units-table">
              <table>
                <thead>
                  <tr>
                    <th>Unit ID</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>History</th>
                  </tr>
                </thead>
                <tbody>
                  {productUnits.map((unit) => (
                    <tr key={unit.id}>
                      <td className="unit-id">{unit.id}</td>
                      <td>
                        <span className={`unit-status-badge ${unit.status === 'active' ? 'active' : 'inactive'}`}>
                          {unit.status || 'active'}
                        </span>
                      </td>
                      <td>
                        {unit.isReturned ? (
                          <span className="stock-type-badge returned">🔄 Returned</span>
                        ) : (
                          <span className="stock-type-badge fresh">📦 Fresh</span>
                        )}
                      </td>
                      <td>
                        <UnitHistoryPreview unitId={unit.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}