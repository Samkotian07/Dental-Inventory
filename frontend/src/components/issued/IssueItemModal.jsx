import { useState } from "react";
import Modal from "./Modal.jsx";
import { students, inventoryOptions } from "../../data/issuedData.js";

export default function IssueItemModal({ onClose, onConfirm }) {
  const [studentId, setStudentId] = useState("");
  const [itemId, setItemId] = useState("");
  const [lotId, setLotId] = useState("");
  const [qty, setQty] = useState(1);

  // Get available lots for the selected item
  const getAvailableLots = () => {
    if (!itemId) return [];
    const selectedItem = inventoryOptions.find(item => item.id === itemId);
    if (!selectedItem) return [];
    if (selectedItem.lots && selectedItem.lots.length > 0) {
      return selectedItem.lots;
    }
    if (selectedItem.lotNo || selectedItem.lot) {
      const lotNum = selectedItem.lotNo || selectedItem.lot;
      return [{
        id: `LOT-${lotNum}`,
        number: lotNum,
        quantity: selectedItem.quantity || selectedItem.qty || 10,
        expiryDate: selectedItem.expiryDate || selectedItem.expiry || ""
      }];
    }
    return [];
  };

  // Get max available quantity for selected lot
  const getMaxAvailableQty = () => {
    if (!lotId) return 0;
    const availableLots = getAvailableLots();
    const selectedLot = availableLots.find(lot => lot.id === lotId);
    return selectedLot?.quantity || 0;
  };

  const availableLots = getAvailableLots();
  const maxQty = getMaxAvailableQty();
  const canSubmit = studentId && itemId && lotId && qty > 0 && qty <= maxQty;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm({ 
      studentId, 
      itemId, 
      lotId,
      qty: Number(qty) 
    });
  };

  // Set lot selection when item changes
  const handleItemChange = (e) => {
    const selectedItemId = e.target.value;
    setItemId(selectedItemId);
    setQty(1);

    if (selectedItemId) {
      const selectedItem = inventoryOptions.find(i => i.id === selectedItemId);
      const lots = selectedItem?.lots || [];
      if (lots.length > 0) {
        setLotId(lots[0].id);
      } else if (selectedItem?.lotNo) {
        setLotId(`LOT-${selectedItem.lotNo}`);
      } else {
        setLotId("");
      }
    } else {
      setLotId("");
    }
  };

  // Reset quantity when lot changes
  const handleLotChange = (e) => {
    setLotId(e.target.value);
    setQty(1); // Reset quantity to 1
  };

  return (
    <Modal title="Issue Item" onClose={onClose} width={440}>
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
                Lot #{lot.number} - {lot.quantity} units available 
                {lot.expiryDate && ` (Exp: ${lot.expiryDate})`}
              </option>
            ))}
          </select>
          {availableLots.length === 0 && (
            <small style={{ color: '#dc3545' }}>
              No lots available for this item
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
          <small>Max available: {maxQty} units</small>
        )}
        {lotId && qty > maxQty && (
          <small style={{ color: '#dc3545' }}>
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