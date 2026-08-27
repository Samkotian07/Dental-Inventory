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
  const [stockSource, setStockSource] = useState("all"); // 'all' | 'fresh' | 'returned'
  const [qty, setQty] = useState(1);

  // Create inventory options from stock
  const inventoryOptions = useMemo(() => 
    stock.map((item) => ({
      id: item.refNo || item.id,
      product: item.product || item.productName,
      lotNo: item.lotNo,
      qty: item.qty,
      expiry: item.expiry,
    })),
    [stock]
  );

  const selectedItem = useMemo(
    () => inventoryOptions.find((i) => i.id === itemId),
    [inventoryOptions, itemId]
  );

  // Aggregate lots from both fresh stock and returned items
  const allLots = useMemo(() => {
    if (!itemId || !selectedItem) return [];

    const lots = [];

    // 1. Fresh stock lot
    if (selectedItem.qty > 0) {
      lots.push({
        id: `FRESH-${selectedItem.lotNo || "LOT-001"}`,
        number: selectedItem.lotNo || "LOT-001",
        source: "fresh",
        quantity: selectedItem.qty,
        expiryDate: selectedItem.expiry || "",
        label: `📦 Lot #${selectedItem.lotNo || "LOT-001"} (Fresh Stock) - ${selectedItem.qty} available${
          selectedItem.expiry ? ` (Exp: ${selectedItem.expiry})` : ""
        }`,
      });
    }

    // 2. Returned stock lots from issuedItems (where status is Returned)
    const returnedMap = {};
    (issuedItems || [])
      .filter((i) => (i.status || "").toLowerCase() === "returned")
      .filter(
        (i) =>
          i.refNo === itemId ||
          (i.product || i.productName) === selectedItem.product
      )
      .forEach((ret) => {
        const lNo = ret.lotNo || "LOT-001";
        if (!returnedMap[lNo]) {
          returnedMap[lNo] = {
            qty: 0,
            latestDate: ret.returnDate || ret.date || ret.issuedDate,
          };
        }
        returnedMap[lNo].qty += Number(ret.qty ?? ret.quantity ?? 1);
      });

    Object.entries(returnedMap).forEach(([lNo, info]) => {
      if (info.qty > 0) {
        lots.push({
          id: `RETURNED-${lNo}`,
          number: lNo,
          source: "returned",
          quantity: info.qty,
          label: `🔄 Lot #${lNo} (Returned Stock) - ${info.qty} available (Returned: ${info.latestDate})`,
        });
      }
    });

    return lots;
  }, [itemId, selectedItem, issuedItems]);

  // Filter lots by selected stockSource filter ('all' | 'fresh' | 'returned')
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
      // Pick first available lot
      const matchItem = inventoryOptions.find((i) => i.id === selectedItemId);
      if (matchItem) {
        const freshId = `FRESH-${matchItem.lotNo || "LOT-001"}`;
        setLotId(freshId);
      } else {
        setLotId("");
      }
    } else {
      setLotId("");
    }
  };

  // Reset quantity when lot changes
  const handleLotChange = (e) => {
    const selectedLotId = e.target.value;
    setLotId(selectedLotId);
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
              {i.product} ({i.id})
            </option>
          ))}
        </select>
      </div>

      {/* Stock Source Toggle - Only show when item is selected */}
      {itemId && (
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
            >
              🔄 Returned Stock
            </button>
          </div>
        </div>
      )}

      {/* Lot Selection - Only show when item is selected */}
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
            Max available in selected lot: <strong>{maxQty} units</strong>
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