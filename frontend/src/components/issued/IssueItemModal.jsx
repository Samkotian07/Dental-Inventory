import { useState, useMemo } from "react";
import Modal from "./Modal.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useInventory } from "../../context/InventoryContext.jsx";
import { toast } from "sonner";

export default function IssueItemModal({ onClose, onConfirm }) {
  const { students } = useData();
  const { stock = [], issuedItems = [] } = useInventory();
  
  const [studentId, setStudentId] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [stockSource, setStockSource] = useState("all");

  // ⭐ Group stock by ref_no (like Stock page)
  const groupedStock = useMemo(() => {
    const groupedMap = {};
    (stock || []).forEach((r) => {
      if (r.quantity <= 0) return; // Skip items with 0 quantity
      
      const key = r.refNo || r.id;
      if (!groupedMap[key]) {
        groupedMap[key] = {
          refNo: r.refNo,
          product: r.product || r.productName,
          category: r.category,
          company: r.company || r.companyName,
          size: r.size,
          lotNo: r.lotNo,
          expiry: r.expiry,
          totalQuantity: 0,
          units: [],
          unitIds: [],
        };
      }
      groupedMap[key].totalQuantity += r.quantity || 1;
      groupedMap[key].units.push(r);
      groupedMap[key].unitIds.push(r.id);
    });
    return Object.values(groupedMap);
  }, [stock]);

  // ⭐ Filter by stock source (fresh/returned)
  const filteredGroupedStock = useMemo(() => {
    if (stockSource === "all") return groupedStock;
    
    return groupedStock.filter((group) => {
      // Check if any unit in this group is fresh or returned
      const hasFresh = group.units.some(u => {
        const hasBeenIssued = issuedItems.some(i => i.inventoryId === u.id && i.status === 'Active');
        return !hasBeenIssued;
      });
      const hasReturned = group.units.some(u => {
        const hasBeenReturned = issuedItems.some(i => i.inventoryId === u.id && i.status === 'Returned');
        return hasBeenReturned;
      });
      
      if (stockSource === "fresh") return hasFresh;
      if (stockSource === "returned") return hasReturned;
      return true;
    });
  }, [groupedStock, stockSource, issuedItems]);

  const selectedItem = useMemo(
    () => filteredGroupedStock.find((i) => i.refNo === itemId),
    [filteredGroupedStock, itemId]
  );

  const maxQty = selectedItem?.totalQuantity || 0;
  const canSubmit = studentId && itemId && qty > 0 && qty <= maxQty;

  const handleSubmit = () => {
    if (!canSubmit || !selectedItem) return;
    
    // ⭐ Find available units to issue
    const availableUnits = selectedItem.units.filter(u => {
      // Check if unit is available (not currently issued)
      const isIssued = issuedItems.some(i => i.inventoryId === u.id && i.status === 'Active');
      return !isIssued;
    });

    if (availableUnits.length < qty) {
      toast.error(`Only ${availableUnits.length} units available for this product`);
      return;
    }

    // ⭐ Issue the requested quantity
    const unitsToIssue = availableUnits.slice(0, qty);
    
    // Issue each unit one by one (or batch)
    onConfirm({
      studentId,
      refNo: selectedItem.refNo,
      qty: Number(qty),
      unitIds: unitsToIssue.map(u => u.id),
      lotNo: selectedItem.lotNo,
      stockType: stockSource === "returned" ? "returned" : "fresh",
    });
  };

  const handleItemChange = (e) => {
    setItemId(e.target.value);
    setQty(1);
  };

  return (
    <Modal title="Issue Item" onClose={onClose} width={460}>
      <div className="modal__field">
        <label htmlFor="issue-student">Student</label>
        <select 
          id="issue-student" 
          value={studentId} 
          onChange={(e) => setStudentId(e.target.value)}
        >
          <option value="">Select student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.id})
            </option>
          ))}
        </select>
      </div>

      <div className="modal__field">
        <label htmlFor="issue-item">Product</label>
        <select 
          id="issue-item" 
          value={itemId} 
          onChange={handleItemChange}
        >
          <option value="">Select product...</option>
          {filteredGroupedStock.map((group) => (
            <option key={group.refNo} value={group.refNo}>
              {group.product} ({group.refNo}) - {group.totalQuantity} available
            </option>
          ))}
        </select>
        {filteredGroupedStock.length === 0 && (
          <small style={{ color: '#dc3545', display: 'block', marginTop: '4px' }}>
            No products available in stock
          </small>
        )}
      </div>

      {/* Stock Source Toggle */}
      {itemId && (
        <div className="modal__field">
          <label>Stock Source</label>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={() => setStockSource("all")}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: stockSource === "all" ? "600" : "400",
                border: stockSource === "all" ? "2px solid #2563EB" : "1px solid #D1D5DB",
                background: stockSource === "all" ? "#EFF6FF" : "white",
                color: stockSource === "all" ? "#1D4ED8" : "#374151",
                cursor: "pointer",
              }}
            >
              All Stock
            </button>
            <button
              type="button"
              onClick={() => setStockSource("fresh")}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: stockSource === "fresh" ? "600" : "400",
                border: stockSource === "fresh" ? "2px solid #059669" : "1px solid #D1D5DB",
                background: stockSource === "fresh" ? "#D1FAE5" : "white",
                color: stockSource === "fresh" ? "#059669" : "#374151",
                cursor: "pointer",
              }}
              disabled={!groupedStock.some(g => g.units.some(u => {
                const hasBeenIssued = issuedItems.some(i => i.inventoryId === u.id && i.status === 'Active');
                return !hasBeenIssued;
              }))}
            >
              📦 Fresh Stock
            </button>
            <button
              type="button"
              onClick={() => setStockSource("returned")}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: stockSource === "returned" ? "600" : "400",
                border: stockSource === "returned" ? "2px solid #D97706" : "1px solid #D1D5DB",
                background: stockSource === "returned" ? "#FEF3C7" : "white",
                color: stockSource === "returned" ? "#D97706" : "#374151",
                cursor: "pointer",
              }}
              disabled={!groupedStock.some(g => g.units.some(u => {
                const hasBeenReturned = issuedItems.some(i => i.inventoryId === u.id && i.status === 'Returned');
                return hasBeenReturned;
              }))}
            >
              🔄 Returned Stock
            </button>
          </div>
        </div>
      )}

      <div className="modal__field">
        <label htmlFor="issue-qty">Quantity</label>
        <input
          id="issue-qty"
          type="number"
          min="1"
          max={maxQty || undefined}
          value={qty}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val >= 1 && val <= maxQty) {
              setQty(val);
            } else if (e.target.value === '') {
              setQty('');
            }
          }}
        />
        {itemId && maxQty > 0 && (
          <small style={{ display: "block", marginTop: "4px" }}>
            Available: <strong>{maxQty} units</strong>
          </small>
        )}
        {itemId && qty > maxQty && (
          <small style={{ color: '#dc3545', display: "block", marginTop: "4px" }}>
            Quantity exceeds available stock ({maxQty} units)
          </small>
        )}
      </div>

      <div className="modal__actions">
        <button className="modal__btn" onClick={onClose}>
          Cancel
        </button>
        <button 
          className="modal__btn modal__btn--primary" 
          onClick={handleSubmit} 
          disabled={!canSubmit}
        >
          Issue Item
        </button>
      </div>
    </Modal>
  );
}