import { useState, useMemo } from "react";
import Modal from "./Modal.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useInventory } from "../../context/InventoryContext.jsx";
import { toast } from "sonner";

function formatDisplayDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function IssueItemModal({ onClose, onConfirm }) {
  const { students } = useData();
  const { stock = [], issuedItems = [], getUnitHistory } = useInventory();
  
  const [studentId, setStudentId] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [stockSource, setStockSource] = useState("all");
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [viewHistoryUnitId, setViewHistoryUnitId] = useState(null);

  // Group stock by ref_no
  const groupedStock = useMemo(() => {
    const groupedMap = {};
    (stock || []).forEach((r) => {
      if (r.quantity <= 0) return;
      
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
          hasFresh: false,
          hasReturned: false,
        };
      }
      groupedMap[key].totalQuantity += r.quantity || 1;
      groupedMap[key].units.push(r);
      groupedMap[key].unitIds.push(r.id);
    });
    
    Object.values(groupedMap).forEach(group => {
      group.hasFresh = group.units.some(u => {
        const isActive = issuedItems.some(i => i.inventoryId === u.id && i.status === 'Active');
        const hasReturned = issuedItems.some(i => i.inventoryId === u.id && i.status === 'Returned');
        return !isActive && !hasReturned && !u.isReturned && u.quantity > 0;
      });
      group.hasReturned = group.units.some(u => {
        const isActive = issuedItems.some(i => i.inventoryId === u.id && i.status === 'Active');
        return !isActive && (u.isReturned === true || issuedItems.some(i => i.inventoryId === u.id && i.status === 'Returned')) && u.quantity > 0;
      });
    });
    
    return Object.values(groupedMap);
  }, [stock, issuedItems]);

  const filteredGroupedStock = useMemo(() => {
    if (stockSource === "all") return groupedStock;
    if (stockSource === "fresh") {
      return groupedStock.filter(g => g.hasFresh);
    }
    if (stockSource === "returned") {
      return groupedStock.filter(g => g.hasReturned);
    }
    return groupedStock;
  }, [groupedStock, stockSource]);

  const selectedItem = useMemo(
    () => filteredGroupedStock.find((i) => i.refNo === itemId),
    [filteredGroupedStock, itemId]
  );

  // ⭐ For returned stock, show individual units with history
  const returnedUnits = useMemo(() => {
    if (!selectedItem || stockSource !== "returned") return [];
    return selectedItem.units
      .filter(u => u.isReturned === true && u.quantity > 0)
      .map(u => ({
        ...u,
        history: getUnitHistory(u.id),
      }));
  }, [selectedItem, stockSource, getUnitHistory]);

  const maxQty = stockSource === "returned" 
    ? returnedUnits.length 
    : (selectedItem?.totalQuantity || 0);
    
  const canSubmit = studentId && itemId && qty > 0 && qty <= maxQty;

  const handleSubmit = () => {
    if (!canSubmit || !selectedItem) return;
    
    let unitIds = [];
    
    if (stockSource === "returned") {
      // For returned stock, use selected unit IDs
      const availableUnits = returnedUnits.map(u => u.id);
      if (selectedUnitId) {
        unitIds = [selectedUnitId];
      } else {
        unitIds = availableUnits.slice(0, qty);
      }
    } else {
      // For fresh/all stock, find available units
      const availableUnits = selectedItem.units.filter(u => {
        const isActive = issuedItems.some(i => i.inventoryId === u.id && i.status === 'Active');
        return !isActive && u.quantity > 0;
      });
      unitIds = availableUnits.slice(0, qty).map(u => u.id);
    }

    if (unitIds.length === 0) {
      toast.error("No available units found");
      return;
    }

    const hasReturned = selectedItem.units.some(u => 
      unitIds.includes(u.id) && u.isReturned === true
    );
    
    onConfirm({
      studentId,
      refNo: selectedItem.refNo,
      qty: unitIds.length,
      unitIds: unitIds,
      lotNo: selectedItem.lotNo,
      stockType: hasReturned ? "returned" : "fresh",
    });
  };

  const handleItemChange = (e) => {
    setItemId(e.target.value);
    setQty(1);
    setSelectedUnitId(null);
  };

  const selectUnit = (unitId) => {
    setSelectedUnitId(unitId);
    setQty(1);
    toast.success(`Selected unit: ${unitId}`);
  };

  return (
    <Modal title="Issue Item" onClose={onClose} width={500}>
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
              disabled={!groupedStock.some(g => g.hasFresh)}
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
              disabled={!groupedStock.some(g => g.hasReturned)}
            >
              🔄 Returned Stock
            </button>
          </div>
        </div>
      )}

      {/* Returned Stock - Show Individual Units */}
      {stockSource === "returned" && selectedItem && returnedUnits.length > 0 && (
        <div className="modal__field">
          <label>Select Returned Unit</label>
          <div className="returned-units-list">
            {returnedUnits.map((unit) => {
              const lastHistory = unit.history?.[0];
              return (
                <div 
                  key={unit.id} 
                  className={`unit-select-card ${selectedUnitId === unit.id ? 'selected' : ''}`}
                  onClick={() => selectUnit(unit.id)}
                  style={{
                    padding: "10px 12px",
                    border: selectedUnitId === unit.id ? "2px solid #D97706" : "1px solid #E5E7EB",
                    borderRadius: "8px",
                    marginBottom: "8px",
                    cursor: "pointer",
                    background: selectedUnitId === unit.id ? "#FEF3C7" : "white",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "600", fontSize: "14px" }}>
                      🔢 {unit.id}
                    </span>
                    <span style={{ 
                      background: "#FEF3C7", 
                      color: "#D97706", 
                      padding: "2px 10px", 
                      borderRadius: "12px", 
                      fontSize: "11px", 
                      fontWeight: "600" 
                    }}>
                      🔄 Returned
                    </span>
                  </div>
                  {lastHistory && (
                    <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>
                      📋 Last: <strong>{lastHistory.student}</strong> 
                      {' '}({formatDisplayDate(lastHistory.returnDate)})
                      <span style={{ marginLeft: "8px" }}>
                        🔄 {unit.history?.length || 0} cycles
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {selectedUnitId && (
            <small style={{ color: "#D97706", display: "block", marginTop: "4px" }}>
              ✅ Selected: {selectedUnitId}
            </small>
          )}
        </div>
      )}

      {/* Quantity - For Returned Stock, auto-set to 1 */}
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
          disabled={stockSource === "returned" && selectedUnitId !== null}
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