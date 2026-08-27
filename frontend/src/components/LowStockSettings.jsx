import { useState, useMemo } from "react";
import { Sliders, Search, TrendingDown, Receipt, Trash2 } from "lucide-react";
import DashboardHeader from "./dashboard/DashboardHeader.jsx";
import { useMenuClick } from "./Layout.jsx";
import { useData } from "../context/DataContext";
import { useInventory } from "../context/InventoryContext";
import { useAuth } from "../context/AuthContext";
import Button from "./common/Button"; 
import { toast } from "sonner";
import "./LowStockSettings.css";

export default function LowStockSettings() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const { stock = [], updateStockItem, returns = [], deleteReturn } = useInventory();
  const { settings = { lowQuantityThreshold: 10 } } = useData();

  const inventory = stock;
  const defaultThreshold = settings?.lowQuantityThreshold ?? 10;

  const [thresholdSearch, setThresholdSearch] = useState("");
  const [thresholdEdits, setThresholdEdits] = useState({});

  const creditNotes = useMemo(() => {
    return (returns || []).filter(
      (r) => r.type === "creditNote" || r.type === "credit_note" || Boolean(r.creditNote)
    );
  }, [returns]);

  const handleRemoveCreditNote = async (returnId, product) => {
    if (window.confirm(`Are you sure you want to remove credit note ${returnId} for "${product}"?`)) {
      const res = await deleteReturn(returnId);
      if (res?.success) {
        toast.success(`Credit note ${returnId} removed successfully`);
      } else {
        toast.error(res?.message || "Failed to remove credit note");
      }
    }
  };

  const handleSaveThresholds = () => {
    const changed = Object.entries(thresholdEdits).filter(
      ([id, val]) => val !== "" && val !== null,
    );
    if (changed.length === 0) {
      toast.error("No thresholds changed");
      return;
    }
    changed.forEach(([id, val]) => {
      updateStockItem(id, { lowStockThreshold: Number(val) });
    });
    setThresholdEdits({});
    toast.success(
      `Updated ${changed.length} product threshold(s)`,
    );
  };

  const filteredInventory = useMemo(() => {
    const q = thresholdSearch.toLowerCase().trim();
    if (!q) return inventory;
    return inventory.filter(
      (item) =>
        (item.productName || item.product || "").toLowerCase().includes(q) ||
        (item.refNo || item.id || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q),
    );
  }, [inventory, thresholdSearch]);

  const getThresholdValue = (item) => {
    const itemId = item.refNo || item.id;
    if (
      thresholdEdits[itemId] !== undefined &&
      thresholdEdits[itemId] !== ""
    ) {
      return thresholdEdits[itemId];
    }
    return item.lowStockThreshold ?? defaultThreshold;
  };

  const unsavedCount = Object.keys(thresholdEdits).filter(
    (k) => thresholdEdits[k] !== "" && thresholdEdits[k] !== null,
  ).length;

  const lowStockCount = inventory.filter(
    (i) => (i.quantity ?? i.qty ?? 0) <= (i.lowStockThreshold ?? defaultThreshold),
  ).length;

  return (
    <>
      <DashboardHeader title="Stock Settings" onMenuClick={onMenuClick} />
      
      <main className="low-stock-settings">
        {/* Summary cards */}
        <section className="lss-summary">
          <div className="lss-stat-card">
            <div className="lss-stat-icon warning">
              <TrendingDown size={18} />
            </div>
            <div>
              <p className="lss-stat-number">{lowStockCount}</p>
              <p className="lss-stat-label">
                Products at or below threshold
              </p>
            </div>
          </div>
          <div className="lss-stat-card">
            <div className="lss-stat-icon primary">
              <Sliders size={18} />
            </div>
            <div>
              <p className="lss-stat-number">{inventory.length}</p>
              <p className="lss-stat-label">Total tracked products</p>
            </div>
          </div>
          <div className="lss-stat-card">
            <div className="lss-stat-icon" style={{ background: "#FEF2F2", color: "#EF4444" }}>
              <Receipt size={18} />
            </div>
            <div>
              <p className="lss-stat-number">{creditNotes.length}</p>
              <p className="lss-stat-label">Active credit notes</p>
            </div>
          </div>
        </section>

        {/* Credit Notes Management Section (Replaces Default Threshold) */}
        <section className="card lss-default-section">
          <div className="lss-default-header">
            <div className="lss-default-icon" style={{ background: "#FEF2F2", color: "#EF4444" }}>
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="lss-default-title">Credit Notes Management</h3>
              <p className="lss-default-subtitle">
                View and remove vendor credit note records.
              </p>
            </div>
          </div>

          <div style={{ marginTop: "14px" }}>
            {creditNotes.length === 0 ? (
              <div style={{ padding: "16px", background: "#F8FAFC", borderRadius: "8px", color: "#64748B", fontSize: "13px", textAlign: "center" }}>
                No active credit notes currently recorded.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="lss-table" style={{ fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th>Return ID</th>
                      <th>Ref No</th>
                      <th>Product</th>
                      <th>Credit Note #</th>
                      <th className="lss-th-center">Qty</th>
                      <th>Return Date</th>
                      <th className="lss-th-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditNotes.map((cn) => (
                      <tr key={cn.returnId} className="lss-table-row">
                        <td className="lss-ref-no">{cn.returnId}</td>
                        <td>{cn.refNo}</td>
                        <td className="lss-product-name">{cn.productName}</td>
                        <td style={{ fontWeight: "600", color: "#2563EB" }}>
                          {cn.creditNote || "—"}
                        </td>
                        <td className="lss-qty-cell">{cn.quantity}</td>
                        <td>{cn.returnDate ? new Date(cn.returnDate).toLocaleDateString() : "—"}</td>
                        <td className="lss-th-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveCreditNote(cn.returnId, cn.productName)}
                            style={{
                              background: "#FEE2E2",
                              color: "#DC2626",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontWeight: "600",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Trash2 size={13} />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Per-product threshold table */}
        <section className="card lss-table-section">
          <div className="lss-table-header">
            <h3 className="lss-table-title">Per-Product Thresholds</h3>
            <Button onClick={handleSaveThresholds} className="lss-save-btn">
              Save All Changes
            </Button>
          </div>

          <div className="lss-search-wrapper">
            <Search size={16} className="lss-search-icon" />
            <input
              type="text"
              value={thresholdSearch}
              onChange={(e) => setThresholdSearch(e.target.value)}
              placeholder="Search by product, ref no, or category..."
              className="lss-search-input"
            />
          </div>

          <div className="lss-table-scroll">
            <table className="lss-table">
              <thead>
                <tr>
                  <th>Ref No</th>
                  <th>Product</th>
                  <th className="lss-th-category">Category</th>
                  <th className="lss-th-center">Current Qty</th>
                  <th className="lss-th-center">Low Stock Threshold</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="lss-empty">
                      No products found
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => {
                    const itemId = item.refNo || item.id;
                    const itemQty = item.quantity ?? item.qty ?? 0;
                    const currentThreshold =
                      item.lowStockThreshold ?? defaultThreshold;
                    const isLow = itemQty <= currentThreshold;
                    const isEdited =
                      thresholdEdits[itemId] !== undefined &&
                      thresholdEdits[itemId] !== "";
                    return (
                      <tr key={itemId} className="lss-table-row">
                        <td className="lss-ref-no">{item.refNo || item.id}</td>
                        <td className="lss-product-name">
                          {item.productName || item.product}
                        </td>
                        <td className="lss-category">
                          {item.category}
                        </td>
                        <td className="lss-qty-cell">
                          <span
                            className={`lss-qty-badge ${isLow ? "lss-qty-low" : "lss-qty-ok"}`}
                          >
                            {itemQty}
                          </span>
                        </td>
                        <td className="lss-threshold-cell">
                          <input
                            type="number"
                            value={getThresholdValue(item)}
                            onChange={(e) =>
                              setThresholdEdits({
                                ...thresholdEdits,
                                [itemId]: e.target.value,
                              })
                            }
                            className={`lss-threshold-input ${isEdited ? "lss-threshold-edited" : ""}`}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {unsavedCount > 0 && (
            <p className="lss-unsaved">{unsavedCount} unsaved change(s)</p>
          )}
        </section>
      </main>
    </>
  );
}
