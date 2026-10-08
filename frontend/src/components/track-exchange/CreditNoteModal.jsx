import { useState, useMemo, useEffect } from "react";
import Modal from "./Modal.jsx";
import { useInventory } from "../../context/InventoryContext.jsx";
import { toast } from "sonner";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function CreditNoteModal({ onClose, onConfirm }) {
  const { stock = [], getLotsForRef, sendOverstockToVendor } = useInventory();

  const [searchRef, setSearchRef] = useState("");
  const [selectedRef, setSelectedRef] = useState("");
  const [lots, setLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("Overstock");
  const [returnDate, setReturnDate] = useState(todayISO());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter stock for product search
  const filteredProducts = useMemo(() => {
    const q = searchRef.trim().toLowerCase();
    if (!q) return stock.slice(0, 50);
    return stock.filter(
      (s) =>
        (s.refNo || "").toLowerCase().includes(q) ||
        (s.product || s.productName || "").toLowerCase().includes(q)
    );
  }, [stock, searchRef]);

  // When a product is selected, load available lots
  useEffect(() => {
    if (!selectedRef) {
      setLots([]);
      setSelectedLotId("");
      return;
    }

    let isMounted = true;
    setLoadingLots(true);
    getLotsForRef(selectedRef).then((fetchedLots) => {
      if (!isMounted) return;
      setLots(fetchedLots || []);
      setLoadingLots(false);
      if (fetchedLots && fetchedLots.length > 0) {
        setSelectedLotId(fetchedLots[0].lotId);
        setQuantity(1);
      } else {
        setSelectedLotId("");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedRef, getLotsForRef]);

  const selectedLot = useMemo(() => {
    return lots.find((l) => l.lotId === selectedLotId);
  }, [lots, selectedLotId]);

  const maxQty = selectedLot ? Math.max(1, selectedLot.qtyAvailable || selectedLot.qtyFresh || 1) : 1;

  const canSubmit = selectedRef && selectedLotId && quantity > 0 && quantity <= maxQty && reason.trim() && !isSubmitting;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const payload = {
        lotId: selectedLotId,
        quantity: Number(quantity),
        reason: reason.trim(),
        returnDate,
      };

      let result;
      if (onConfirm) {
        result = await onConfirm(payload);
      } else if (sendOverstockToVendor) {
        result = await sendOverstockToVendor(payload);
      }

      if (result?.success) {
        toast.success("Credit note return created successfully");
        onClose();
      } else {
        toast.error(result?.message || "Failed to create credit note return");
      }
    } catch (err) {
      toast.error(err.message || "Failed to submit credit note return");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title="Create Credit Note Return" onClose={onClose} width={480}>
      <form onSubmit={handleSubmit}>
        {/* Search / Select Product by ref_no */}
        <div className="modal__field">
          <label htmlFor="credit-search">Search Product by Ref No / Name</label>
          <input
            id="credit-search"
            type="text"
            placeholder="Type to search products..."
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value)}
            style={{ marginBottom: "8px" }}
          />

          <label htmlFor="credit-item">Select Product *</label>
          <select
            id="credit-item"
            value={selectedRef}
            onChange={(e) => setSelectedRef(e.target.value)}
            required
          >
            <option value="">Select a product...</option>
            {filteredProducts.map((p) => (
              <option key={p.refNo || p.id} value={p.refNo || p.id}>
                {p.refNo} — {p.productName || p.product} ({p.company || p.companyName || "Vendor"})
              </option>
            ))}
          </select>
        </div>

        {/* Load available lots via GET /api/inventory/available-lots/<ref_no> */}
        <div className="modal__field">
          <label htmlFor="credit-lot">Available Lot *</label>
          {loadingLots ? (
            <p style={{ fontSize: "13px", color: "var(--ink-soft)" }}>Loading available lots...</p>
          ) : selectedRef && lots.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#dc2626" }}>
              No available open lots found for this product.
            </p>
          ) : (
            <select
              id="credit-lot"
              value={selectedLotId}
              onChange={(e) => {
                setSelectedLotId(e.target.value);
                setQuantity(1);
              }}
              disabled={!selectedRef || lots.length === 0}
              required
            >
              <option value="">Select an available lot...</option>
              {lots.map((l) => (
                <option key={l.lotId} value={l.lotId}>
                  Lot #{l.lotNo} — Avail: {l.qtyAvailable ?? l.qtyFresh} units {l.expiryDate ? `(Exp: ${l.expiryDate})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Quantity */}
        <div className="modal__field">
          <label htmlFor="credit-qty">
            Quantity * {selectedLot && `(Max: ${maxQty})`}
          </label>
          <input
            id="credit-qty"
            type="number"
            min="1"
            max={maxQty}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
            disabled={!selectedLotId}
            required
          />
        </div>

        {/* Reason */}
        <div className="modal__field">
          <label htmlFor="credit-reason">Reason *</label>
          <textarea
            id="credit-reason"
            rows={2}
            placeholder="Overstock, excess stock to vendor, etc."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        {/* Return Date */}
        <div className="modal__field">
          <label htmlFor="credit-date">Return Date</label>
          <input
            id="credit-date"
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </div>

        <div className="modal__actions">
          <button type="button" className="modal__btn" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="modal__btn modal__btn--primary"
            disabled={!canSubmit}
          >
            {isSubmitting ? "Submitting..." : "Submit Credit Note Return"}
          </button>
        </div>
      </form>
    </Modal>
  );
}