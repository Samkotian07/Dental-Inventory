import { useState, useMemo } from "react";
import { Sliders, Search, AlertTriangle, TrendingDown } from "lucide-react";
import DashboardHeader from "./dashboard/DashboardHeader.jsx";
import { useMenuClick } from "./Layout.jsx";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import Button from "./common/Button"; 
import Input from "./common/Input"; 
import { toast } from "sonner";
import "./LowStockSettings.css";
export default function LowStockSettings() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const { inventory, settings, updateSettings, updateItemThresholds } =
    useData();
  const [lowQty, setLowQty] = useState(settings.lowQuantityThreshold);
  const [thresholdSearch, setThresholdSearch] = useState("");
  const [thresholdEdits, setThresholdEdits] = useState({});

  const handleLowQty = () => {
    updateSettings({ lowQuantityThreshold: Number(lowQty) });
    toast.success("Default low quantity threshold updated");
  };

  const handleSaveThresholds = () => {
    const changed = Object.entries(thresholdEdits).filter(
      ([id, val]) => val !== "" && val !== null,
    );
    if (changed.length === 0) {
      toast.error("No thresholds changed");
      return;
    }
    const updates = {};
    changed.forEach(([id, val]) => {
      updates[id] = Number(val);
    });
    updateItemThresholds(updates, user?.name || "Admin");
    setThresholdEdits({});
    toast.success(
      `Updated ${Object.keys(updates).length} product threshold(s)`,
    );
  };

  const filteredInventory = useMemo(() => {
    const q = thresholdSearch.toLowerCase().trim();
    if (!q) return inventory;
    return inventory.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        item.refNo.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [inventory, thresholdSearch]);

  const getThresholdValue = (item) => {
    if (
      thresholdEdits[item.id] !== undefined &&
      thresholdEdits[item.id] !== ""
    ) {
      return thresholdEdits[item.id];
    }
    return item.lowStockThreshold ?? settings.lowQuantityThreshold;
  };

  const unsavedCount = Object.keys(thresholdEdits).filter(
    (k) => thresholdEdits[k] !== "" && thresholdEdits[k] !== null,
  ).length;

  const lowStockCount = inventory.filter(
    (i) => i.quantity <= (i.lowStockThreshold ?? settings.lowQuantityThreshold),
  ).length;

  return (
    <>
      <DashboardHeader title="Low Stock Management" onMenuClick={onMenuClick} />
      
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
        </section>

        {/* Default threshold section */}
        <section className="card lss-default-section">
          <div className="lss-default-header">
            <div className="lss-default-icon">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="lss-default-title">Default Threshold</h3>
              <p className="lss-default-subtitle">
                Applied to newly inserted items that don't have a specific threshold set.
              </p>
            </div>
          </div>
          <div className="lss-default-controls">
            <Input
              label="Default Low Quantity Threshold"
              type="number"
              value={lowQty}
              onChange={(e) => setLowQty(e.target.value)}
              className="lss-default-input"
            />
            <Button onClick={handleLowQty} className="lss-default-btn">
              Save Default
            </Button>
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
                    const currentThreshold =
                      item.lowStockThreshold ?? settings.lowQuantityThreshold;
                    const isLow = item.quantity <= currentThreshold;
                    const isEdited =
                      thresholdEdits[item.id] !== undefined &&
                      thresholdEdits[item.id] !== "";
                    return (
                      <tr key={item.id} className="lss-table-row">
                        <td className="lss-ref-no">{item.refNo}</td>
                        <td className="lss-product-name">
                          {item.productName}
                        </td>
                        <td className="lss-category">
                          {item.category}
                        </td>
                        <td className="lss-qty-cell">
                          <span
                            className={`lss-qty-badge ${isLow ? "lss-qty-low" : "lss-qty-ok"}`}
                          >
                            {item.quantity}
                          </span>
                        </td>
                        <td className="lss-threshold-cell">
                          <input
                            type="number"
                            value={getThresholdValue(item)}
                            onChange={(e) =>
                              setThresholdEdits({
                                ...thresholdEdits,
                                [item.id]: e.target.value,
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
