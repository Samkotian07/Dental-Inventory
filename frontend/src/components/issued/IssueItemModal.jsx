import { useState, useMemo, useEffect } from "react";
import Modal from "./Modal.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useInventory } from "../../context/InventoryContext.jsx";
import { toast } from "sonner";
import "./IssueItemModal.css";

function formatDisplayDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function IssueItemModal({ onClose, onConfirm }) {
  const { students } = useData();
  const { stock = [], issuedItems = [], getUnitHistory, getLotsForRef, getReturnedUnitsForRef } = useInventory();

  const [studentId, setStudentId] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [stockSource, setStockSource] = useState("all");
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [apiReturnedUnits, setApiReturnedUnits] = useState([]);

  // Lot selection
  const [availableLots, setAvailableLots] = useState([]);
  const [selectedLotId, setSelectedLotId] = useState("");
  const [lotsLoading, setLotsLoading] = useState(false);

  // Group stock by ref_no
  const groupedStock = useMemo(() => {
    const groupedMap = {};
    (stock || []).forEach((r) => {
      if (!r.lotNo || String(r.lotNo).trim() === "") return;
      if (Number(r.quantity ?? 0) <= 0) return;
      
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
          isReturnable: r.isReturnable,
          freshStock: r.freshStock || 0,
          returnedStock: r.returnedStock || 0,
          totalQuantity: 0,
          units: [],
          unitIds: [],
          hasFresh: false,
          hasReturned: false,
        };
      }
      groupedMap[key].totalQuantity += Number(r.quantity ?? 0);
      groupedMap[key].freshStock += (r.freshStock || 0);
      groupedMap[key].returnedStock += (r.returnedStock || 0);
      groupedMap[key].units.push(r);
      groupedMap[key].unitIds.push(r.id);
    });
    
    Object.values(groupedMap).forEach(group => {
      group.hasFresh = group.freshStock > 0 || group.units.some(u => {
        const isActive = issuedItems.some(i => i.inventoryId === u.id && i.status === 'Active');
        const hasReturned = issuedItems.some(i => i.inventoryId === u.id && i.status === 'Returned');
        return !isActive && !hasReturned && !u.isReturned && u.quantity > 0;
      });
      group.hasReturned = group.returnedStock > 0 || group.units.some(u => {
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
      return groupedStock.filter(g => (g.hasReturned || g.returnedStock > 0) && g.isReturnable !== false);
    }
    return groupedStock;
  }, [groupedStock, stockSource]);

  const selectedItem = useMemo(
    () => groupedStock.find((i) => i.refNo === itemId),
    [groupedStock, itemId]
  );

  useEffect(() => {
    if (!itemId) {
      setApiReturnedUnits([]);
      return;
    }
    if (getReturnedUnitsForRef) {
      getReturnedUnitsForRef(itemId).then((units) => {
        setApiReturnedUnits(units || []);
      }).catch(() => {
        setApiReturnedUnits([]);
      });
    }
  }, [itemId, getReturnedUnitsForRef]);

  const hasReturned = apiReturnedUnits.length > 0;

  const returnedUnits = useMemo(() => {
    if (!selectedItem || stockSource !== "returned") return [];
    return apiReturnedUnits.map((u) => {
      const uId = u.unitSerial || u.unitId;
      const matchingIssue = (issuedItems || []).find((i) =>
        i.unitSerial === uId ||
        i.unitId === uId ||
        (i.units && i.units.some((subU) => subU.unitSerial === uId || subU.unitId === uId))
      );
      const studentName = u.studentName || u.student || matchingIssue?.student || matchingIssue?.studentName || "—";
      const studentId = u.studentId || matchingIssue?.studentId || "";
      const returnDate = u.returnedDate || matchingIssue?.returnDate;
      const lotNo = u.lotNo || u.lot_no || matchingIssue?.lotNo || "—";

      return {
        ...u,
        id: uId,
        lotNo,
        studentName,
        studentId,
        returnDate,
      };
    });
  }, [selectedItem, stockSource, apiReturnedUnits, issuedItems]);

  const selectedLot = availableLots.find((l) => l.lotId === selectedLotId);

  const maxQty = stockSource === "returned" 
    ? (selectedUnitId ? 1 : returnedUnits.length)
    : (selectedLot ? Number(selectedLot.qtyAvailable || 0) : (selectedItem?.totalQuantity || 0));
    
  const canSubmit = studentId && itemId && Number(qty) > 0 && Number(qty) <= maxQty &&
    // For fresh/all stock, a lot must be selected
    (stockSource === "returned" || selectedLotId !== "");

  // ⭐ Check if product is non-returnable (implant/abutment)
  const isNonReturnable = selectedItem?.isReturnable === false;

  const handleSubmit = () => {
    if (!canSubmit || !selectedItem) return;

    const requestedQty = Math.max(1, parseInt(qty, 10) || 1);
    const isReturned = stockSource === "returned" || Boolean(selectedUnitId);

    let unitIds = [];
    if (isReturned) {
      if (selectedUnitId) {
        unitIds = [selectedUnitId];
      } else {
        unitIds = returnedUnits.slice(0, requestedQty).map((u) => u.id);
      }
    }

    const returnedUnitObj = returnedUnits.find((u) => u.id === (selectedUnitId || unitIds[0]));
    const effectiveLotId = isReturned ? (returnedUnitObj?.lotId || null) : (selectedLotId || null);

    onConfirm({
      studentId,
      refNo: selectedItem.refNo,
      lotId: effectiveLotId,
      qty: isReturned ? (selectedUnitId ? 1 : unitIds.length) : requestedQty,
      quantity: isReturned ? (selectedUnitId ? 1 : unitIds.length) : requestedQty,
      unitIds: isReturned ? unitIds : [],
      lotNo: isReturned ? (returnedUnitObj?.lotNo || selectedItem.lotNo) : (selectedLot?.lotNo || selectedItem.lotNo),
      stockType: isReturned ? "returned" : "fresh",
      isNonReturnable: isNonReturnable,
      isImplantAbutment: isNonReturnable,
    });
  };

  const handleItemChange = (e) => {
    const newRefNo = e.target.value;
    setItemId(newRefNo);
    setQty(1);
    setSelectedUnitId(null);
    setSelectedLotId("");
    setAvailableLots([]);

    if (newRefNo) {
      setLotsLoading(true);
      getLotsForRef(newRefNo).then((lots) => {
        setAvailableLots(lots || []);
        setLotsLoading(false);
      }).catch(() => setLotsLoading(false));
    }
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
          {(students || []).filter(s => s.status !== 'archived').map((s) => (
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
              {group.isReturnable === false && " 🔒 Non-Returnable (Implant/Abutment)"}
            </option>
          ))}
        </select>
        {filteredGroupedStock.length === 0 && (
          <small style={{ color: '#dc3545', display: 'block', marginTop: '4px' }}>
            No products available in stock
          </small>
        )}
      </div>
      {/* Lot Selection — shown after product is picked (non-returned stock) */}
      {itemId && stockSource !== "returned" && (
        <div className="modal__field">
          <label htmlFor="issue-lot">Lot</label>
          {lotsLoading ? (
            <small style={{ color: "#6B7280" }}>Loading lots…</small>
          ) : availableLots.length === 0 ? (
            <small style={{ color: "#DC2626", display: "block", marginTop: "4px" }}>
              ⚠️ No open lots available for this product. Receive stock first.
            </small>
          ) : (
            <select
              id="issue-lot"
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(e.target.value)}
            >
              <option value="">-- Select Lot --</option>
              {availableLots.map((lot) => (
                <option key={lot.lotId} value={lot.lotId}>
                  Lot {lot.lotNo} · Qty {lot.qtyAvailable} avail
                  {lot.expiryDate ? ` · Exp ${lot.expiryDate}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

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
              disabled={!hasReturned}
            >
              🔄 Returned Stock
            </button>
          </div>
          {isNonReturnable && (
            <small style={{ color: '#D97706', display: 'block', marginTop: '4px' }}>
              ⚠️ This product is non-returnable (implant/abutment). It will be marked as issued and can only be exchanged with vendor if defective.
            </small>
          )}
        </div>
      )}

      {/* Returned Stock - Show Individual Units */}
      {stockSource === "returned" && selectedItem && returnedUnits.length > 0 && (
        <div className="modal__field">
          <label>Select Returned Unit</label>
          <div className="returned-units-list">
            {returnedUnits.map((unit) => {
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
                    <span style={{ fontWeight: "600", fontSize: "14px", color: "#1F2937" }}>
                      📦 Lot {unit.lotNo || "—"}
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
                  <div style={{ fontSize: "12.5px", color: "#4B5563", marginTop: "4px" }}>
                    👤 Last issued to: <strong>{unit.studentName}</strong>
                    {unit.studentId ? ` (${unit.studentId})` : ""}
                    {unit.returnDate && (
                      <span style={{ marginLeft: "8px", color: "#6B7280" }}>
                        · Returned: {formatDisplayDate(unit.returnDate)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {selectedUnitId && (
            <small style={{ color: "#D97706", display: "block", marginTop: "4px" }}>
              ✅ Selected: Lot {returnedUnits.find(u => u.id === selectedUnitId)?.lotNo || selectedUnitId}
              {returnedUnits.find(u => u.id === selectedUnitId)?.studentName && returnedUnits.find(u => u.id === selectedUnitId)?.studentName !== "—"
                ? ` (Last issued to: ${returnedUnits.find(u => u.id === selectedUnitId)?.studentName})`
                : ""}
            </small>
          )}
        </div>
      )}

      {/* Quantity */}
      <div className="modal__field">
        <label htmlFor="issue-qty">Quantity</label>
        <input
          id="issue-qty"
          type="number"
          min="1"
          max={maxQty || undefined}
          value={qty}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (Number.isNaN(val)) {
              setQty('');
            } else {
              setQty(val);
            }
          }}
          disabled={stockSource === "returned" && selectedUnitId !== null}
        />
        {itemId && maxQty > 0 && (
          <small style={{ display: "block", marginTop: "4px" }}>
            Available: <strong>{maxQty} units</strong>
            {selectedLot && ` in Lot ${selectedLot.lotNo}`}
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