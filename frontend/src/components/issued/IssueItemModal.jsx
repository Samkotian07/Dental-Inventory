import { useState, useMemo } from "react";
import Modal from "./Modal.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useInventory } from "../../context/InventoryContext.jsx";

export default function IssueItemModal({ onClose, onConfirm }) {
  const { students } = useData();
  const { stock = [], issuedItems = [] } = useInventory();
  
  const [studentId, setStudentId] = useState("");
  const [itemId, setItemId] = useState("");
  const [lotId, setLotId] = useState("");
  const [stockSource, setStockSource] = useState("all");
  const [qty, setQty] = useState(1);

  // Create inventory options from stock
  const inventoryOptions = useMemo(() => 
    stock
      .filter((item) => item.quantity > 0 && item.status === 'active') // ⭐ ONLY show items with stock
      .map((item) => ({
        id: item.refNo || item.id,
        product: item.product || item.productName,
        lotNo: item.lotNo,
        quantity: item.quantity || item.qty || 0,
        expiry: item.expiry,
      })),
    [stock]
  );

  const selectedItem = useMemo(
    () => inventoryOptions.find((i) => i.id === itemId),
    [inventoryOptions, itemId]
  );

  // ⭐ FIXED: Aggregate lots correctly
  const allLots = useMemo(() => {
    if (!itemId || !selectedItem) return [];

    const lots = [];

    // 1. Fresh stock lot - ONLY from actual stock quantity
    if (selectedItem.quantity > 0) {
      // Check if this item has been issued before
      const hasBeenIssued = issuedItems.some(i => 
        i.refNo === itemId && i.status === 'active'
      );
      
      // If it has been issued before, it's NOT fresh stock
      // It's either returned stock or has no available fresh units
      const isFresh = !hasBeenIssued;
      
      if (isFresh) {
        lots.push({
          id: `FRESH-${selectedItem.lotNo || "LOT-001"}`,
          number: selectedItem.lotNo || "LOT-001",
          source: "fresh",
          quantity: selectedItem.quantity,
          expiryDate: selectedItem.expiry || "",
          label: `📦 Lot #${selectedItem.lotNo || "LOT-001"} (Fresh Stock) - ${selectedItem.quantity} available${selectedItem.expiry ? ` (Exp: ${selectedItem.expiry})` : ""}`,
        });
      }
    }

    // 2. Returned stock - ONLY items that are actually available in stock
    // and have return history
    const returnedMap = {};
    (issuedItems || [])
      .filter((i) => (i.status || "").toLowerCase() === "returned")
      .filter((i) => i.refNo === itemId)
      .forEach((ret) => {
        const lNo = ret.lotNo || "LOT-001";
        if (!returnedMap[lNo]) {
          returnedMap[lNo] = {
            qty: 0,
            latestDate: ret.returnDate || ret.date || ret.issuedDate,
          };
        }
        // ⭐ FIX: Only count if this is the MOST RECENT return
        // Track unique returns, not total count
        returnedMap[lNo].qty = 1; // Only 1 physical item returned
        returnedMap[lNo].latestDate = ret.returnDate || ret.date || ret.issuedDate;
      });

    // ⭐ FIX: Only add returned stock if there are NO fresh stock available
    // AND the item is currently available in stock (quantity > 0)
    const hasFreshStock = lots.some(l => l.source === 'fresh');
    const isAvailableInStock = stock.some(s => 
      (s.refNo === itemId || s.id === itemId) && s.quantity > 0
    );

    if (!hasFreshStock && isAvailableInStock) {
      Object.entries(returnedMap).forEach(([lNo, info]) => {
        if (info.qty > 0) {
          // Get actual stock quantity
          const stockItem = stock.find(s => s.refNo === itemId || s.id === itemId);
          const actualQty = stockItem?.quantity || 1;
          
          lots.push({
            id: `RETURNED-${lNo}`,
            number: lNo,
            source: "returned",
            quantity: actualQty, // ⭐ Use actual stock quantity
            label: `🔄 Lot #${lNo} (Returned Stock) - ${actualQty} available (Last Returned: ${info.latestDate})`,
          });
        }
      });
    }

    return lots;
  }, [itemId, selectedItem, issuedItems, stock]);

  // Filter lots by selected stockSource filter
  const availableLots = useMemo(() => {
    if (stockSource === "fresh") return allLots.filter((l) => l.source === "fresh");
    if (stockSource === "returned") return allLots.filter((l) => l.source === "returned");
    return allLots;
  }, [allLots, stockSource]);

  // Get max available quantity for selected lot
  const selectedLot = useMemo(
    () => availableLots.find((l) => l.id === lotId) || allLots.find((l) => l.id === lotId),
    [availableLots, allLots, lotId]
  );
  const maxQty = selectedLot?.quantity || 0;

  const canSubmit = studentId && itemId && lotId && qty > 0 && qty <= maxQty;

  const handleSubmit = () => {
    if (!canSubmit || !selectedLot) return;
    onConfirm({ 
      studentId, 
      itemId, 
      lotId,
      lotNo: selectedLot.number,
      stockType: selectedLot.source,
      qty: Number(qty) 
    });
  };

  // Set lot selection when item changes
  const handleItemChange = (e) => {
    const selectedItemId = e.target.value;
    setItemId(selectedItemId);
    setQty(1);

    if (selectedItemId) {
      // Find the selected item in stock
      const matchItem = stock.find(s => s.refNo === selectedItemId || s.id === selectedItemId);
      if (matchItem) {
        // Check if it's fresh or returned
        const hasBeenIssued = issuedItems.some(i => 
          i.refNo === selectedItemId && i.status === 'active'
        );
        if (!hasBeenIssued && matchItem.quantity > 0) {
          setLotId(`FRESH-${matchItem.lotNo || "LOT-001"}`);
        } else if (matchItem.quantity > 0) {
          setLotId(`RETURNED-${matchItem.lotNo || "LOT-001"}`);
        } else {
          setLotId("");
        }
      } else {
        setLotId("");
      }
    } else {
      setLotId("");
    }
  };

  const handleLotChange = (e) => {
    setLotId(e.target.value);
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
        <label htmlFor="issue-item">Inventory Item</label>
        <select 
          id="issue-item" 
          value={itemId} 
          onChange={handleItemChange}
        >
          <option value="">Select item...</option>
          {inventoryOptions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.product} ({i.id}) - {i.quantity} available
            </option>
          ))}
        </select>
        {inventoryOptions.length === 0 && (
          <small style={{ color: '#dc3545', display: 'block', marginTop: '4px' }}>
            No items currently in stock
          </small>
        )}
      </div>

      {/* Stock Source Toggle */}
      {itemId && allLots.length > 0 && (
        <div className="modal__field">
          <label>Stock Source</label>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={() => {
                setStockSource("all");
                if (allLots.length > 0) setLotId(allLots[0].id);
              }}
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
              onClick={() => {
                setStockSource("fresh");
                const freshMatch = allLots.find((l) => l.source === "fresh");
                if (freshMatch) setLotId(freshMatch.id);
              }}
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
              disabled={!allLots.some(l => l.source === 'fresh')}
            >
              📦 Fresh Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setStockSource("returned");
                const retMatch = allLots.find((l) => l.source === "returned");
                if (retMatch) setLotId(retMatch.id);
              }}
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
              disabled={!allLots.some(l => l.source === 'returned')}
            >
              🔄 Returned Stock
            </button>
          </div>
        </div>
      )}

      {/* Lot Selection */}
      {itemId && (
        <div className="modal__field">
          <label htmlFor="issue-lot">Select Lot</label>
          <select 
            id="issue-lot" 
            value={lotId} 
            onChange={handleLotChange}
          >
            <option value="">Choose lot...</option>
            {availableLots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.label}
              </option>
            ))}
          </select>
          {availableLots.length === 0 && (
            <small style={{ color: '#dc3545', marginTop: "4px", display: "block" }}>
              No {stockSource !== "all" ? stockSource : ""} lots available for this item
            </small>
          )}
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
        {lotId && maxQty > 0 && (
          <small style={{ display: "block", marginTop: "4px" }}>
            Max available: <strong>{maxQty} units</strong>
          </small>
        )}
        {lotId && qty > maxQty && (
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