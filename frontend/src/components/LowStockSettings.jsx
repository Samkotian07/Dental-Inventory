import { useState, useMemo, useEffect } from "react";
import { Sliders, Search, TrendingDown, Receipt, Trash2 } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import { useMenuClick } from "../components/Layout.jsx";
import { useInventory } from "../context/InventoryContext";
import { useAuth } from "../context/AuthContext";
import Button from "../components/common/Button"; 
import { toast } from "sonner";
import "./LowStockSettings.css";

export default function LowStockSettings() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const { stock = [], fetchStock, updateStockItem, returns = [], deleteReturn } = useInventory();

  const [thresholdSearch, setThresholdSearch] = useState("");
  const [thresholdEdits, setThresholdEdits] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (fetchStock) {
      fetchStock();
    }
  }, [fetchStock]);

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

  const handleSaveThresholds = async () => {
    const changed = Object.entries(thresholdEdits).filter(
      ([id, val]) => val !== "" && val !== null && val !== undefined
    );
    
    if (changed.length === 0) {
      toast.info("No thresholds changed");
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorMessages = [];

    for (const [key, val] of changed) {
      const newThreshold = Number(val);
      if (isNaN(newThreshold) || newThreshold < 0) {
        errorMessages.push(`Invalid threshold value for ${key}`);
        continue;
      }

      const matchingUnits = stock.filter(s => s.refNo === key || s.id === key);
      
      if (matchingUnits.length > 0) {
        for (const unit of matchingUnits) {
          try {
            const result = await updateStockItem(unit.id, { 
              low_stock_threshold: newThreshold
            });
            if (result?.success) {
              successCount++;
            } else {
              errorMessages.push(`Failed to update ${unit.id}: ${result?.message || 'Unknown error'}`);
            }
          } catch (err) {
            errorMessages.push(`Error updating ${unit.id}: ${err.message}`);
          }
        }
      } else {
        try {
          const result = await updateStockItem(key, { 
            low_stock_threshold: newThreshold
          });
          if (result?.success) {
            successCount++;
          } else {
            errorMessages.push(`Failed to update ${key}: ${result?.message || 'Unknown error'}`);
          }
        } catch (err) {
          errorMessages.push(`Error updating ${key}: ${err.message}`);
        }
      }
    }

    setIsSaving(false);

    if (successCount > 0) {
      toast.success(`Updated ${successCount} threshold(s) successfully`);
      setThresholdEdits({});
      await fetchStock();
    } else {
      toast.error(errorMessages.join(", ") || "Failed to update thresholds");
    }
  };

  // ⭐ CRITICAL FIX: Use actual threshold from item, NO fallback to default
  const groupedInventory = useMemo(() => {
    const q = thresholdSearch.toLowerCase().trim();
    const map = {};
    
    (stock || []).forEach((item) => {
      const key = item.refNo || item.id;
      
      if (!map[key]) {
        map[key] = {
          id: key,
          refNo: key,
          productName: item.productName || item.product || "Product",
          category: item.category || "General",
          quantity: 0,
          qty: 0,
          units: [],
          // ⭐ CRITICAL: Use item's actual threshold, NO fallback
          lowStockThreshold: item.lowStockThreshold ?? 10,
          status: item.status,
        };
      }
      
      if (item.status === "active" || !item.status) {
        const unitQty = item.quantity || item.qty || 1;
        map[key].quantity += unitQty;
        map[key].qty += unitQty;
        map[key].units.push(item.id);
      }
    });

    let list = Object.values(map);
    
    if (q) {
      list = list.filter(
        (item) =>
          (item.productName || "").toLowerCase().includes(q) ||
          (item.refNo || "").toLowerCase().includes(q) ||
          (item.category || "").toLowerCase().includes(q)
      );
    }
    
    return list;
  }, [stock, thresholdSearch]);

  // ⭐ CRITICAL FIX: Use item's actual threshold, NO fallback
  const getThresholdValue = (item) => {
    const itemId = item.refNo || item.id;
    if (thresholdEdits[itemId] !== undefined && thresholdEdits[itemId] !== "") {
      return thresholdEdits[itemId];
    }
    // ⭐ Use the actual threshold from the item, fallback to 10 ONLY if undefined
    return item.lowStockThreshold ?? 10;
  };

  const unsavedCount = Object.keys(thresholdEdits).filter(
    (k) => thresholdEdits[k] !== "" && thresholdEdits[k] !== null && thresholdEdits[k] !== undefined
  ).length;

  // ⭐ CRITICAL FIX: Use actual threshold, NO fallback
  const lowStockCount = groupedInventory.filter((i) => {
    const qty = i.quantity ?? i.qty ?? 0;
    const threshold = i.lowStockThreshold ?? 10;
    return qty <= threshold;
  }).length;

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
              <p className="lss-stat-label">Products at or below threshold</p>
            </div>
          </div>
          <div className="lss-stat-card">
            <div className="lss-stat-icon primary">
              <Sliders size={18} />
            </div>
            <div>
              <p className="lss-stat-number">{groupedInventory.length}</p>
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

        {/* Credit Notes Management Section */}
        <section className="card lss-credit-section">
          <div className="lss-default-header">
            <div className="lss-default-icon" style={{ background: "#FEF2F2", color: "#EF4444" }}>
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="lss-default-title">Credit Notes Management</h3>
              <p className="lss-default-subtitle">View and remove vendor credit note records.</p>
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
                        <td style={{ fontWeight: "600", color: "#2563EB" }}>{cn.creditNote || "—"}</td>
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
                            <Trash2 size={13} /> Remove
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
            <Button 
              onClick={handleSaveThresholds} 
              className="lss-save-btn"
              disabled={isSaving || unsavedCount === 0}
            >
              {isSaving ? "Saving..." : `Save ${unsavedCount > 0 ? `(${unsavedCount})` : ""}`}
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
                {groupedInventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="lss-empty">No products found</td>
                  </tr>
                ) : (
                  groupedInventory.map((item) => {
                    const itemId = item.refNo || item.id;
                    const itemQty = item.quantity ?? item.qty ?? 0;
                    // ⭐ CRITICAL: Use actual threshold, NO fallback
                    const currentThreshold = item.lowStockThreshold ?? 10;
                    const isLow = itemQty <= currentThreshold;
                    const isEdited = thresholdEdits[itemId] !== undefined && thresholdEdits[itemId] !== "";
                    
                    return (
                      <tr key={itemId} className="lss-table-row">
                        <td className="lss-ref-no">{item.refNo || item.id}</td>
                        <td className="lss-product-name">{item.productName || item.product}</td>
                        <td className="lss-category">{item.category}</td>
                        <td className="lss-qty-cell">
                          <span className={`lss-qty-badge ${isLow ? "lss-qty-low" : "lss-qty-ok"}`}>
                            {itemQty}
                          </span>
                        </td>
                        <td className="lss-threshold-cell">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={getThresholdValue(item)}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              setThresholdEdits({
                                ...thresholdEdits,
                                [itemId]: val,
                              });
                            }}
                            className={`lss-threshold-input ${isEdited ? "lss-threshold-edited" : ""}`}
                            placeholder="0"
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