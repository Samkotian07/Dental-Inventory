import { useState, useMemo } from "react";
import { Sliders, Search, AlertTriangle, TrendingDown } from "lucide-react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import Button from "./common/Button"; 
import Input from "./common/Input"; 
import { toast } from "sonner";
import "./LowStockSettings.css";
export default function LowStockSettings() {
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
    <div className="low-stock-settings">
      {/* Header */}
      <div className="low-stock-header">
        <div className="low-stock-header-icon">
          <AlertTriangle size={22} />
        </div>
        <div>
          <h2 className="low-stock-title">Low Stock Management</h2>
          <p className="low-stock-subtitle">
            Configure per-product low stock thresholds to receive alerts when
            inventory runs low.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="low-stock-summary">
        <div className="low-stock-card">
          <div className="low-stock-card-icon warning">
            <TrendingDown size={18} />
          </div>
          <div>
            <p className="low-stock-card-number">{lowStockCount}</p>
            <p className="low-stock-card-label">
              Products at or below threshold
            </p>
          </div>
        </div>
        <div className="low-stock-card">
          <div className="low-stock-card-icon primary">
            <Sliders size={18} />
          </div>
          <div>
            <p className="low-stock-card-number">{inventory.length}</p>
            <p className="low-stock-card-label">Total tracked products</p>
          </div>
        </div>
      </div>

      {/* Default threshold */}
      <div className="low-stock-default">
        <div className="low-stock-default-icon">
          <Sliders size={18} />
        </div>
        <div className="low-stock-default-content">
          <h3 className="low-stock-default-title">Default Threshold</h3>
          <p className="low-stock-default-subtitle">
            Applied to newly inserted items that don't have a specific threshold
            set.
          </p>
          <div className="low-stock-default-controls">
            <Input
              label="Default Low Quantity Threshold"
              type="number"
              value={lowQty}
              onChange={(e) => setLowQty(e.target.value)}
              className="low-stock-default-input"
            />
            <Button onClick={handleLowQty} className="low-stock-default-btn">
              Save Default
            </Button>
          </div>
        </div>
      </div>

      {/* Per-product threshold table */}
      <div className="low-stock-table-section">
        <div className="low-stock-table-header">
          <h3 className="low-stock-table-title">Per-Product Thresholds</h3>
          <Button onClick={handleSaveThresholds} className="low-stock-save-btn">
            Save All Changes
          </Button>
        </div>

        <div className="low-stock-search-wrapper">
          <Search size={16} className="low-stock-search-icon" />
          <input
            type="text"
            value={thresholdSearch}
            onChange={(e) => setThresholdSearch(e.target.value)}
            placeholder="Search by product, ref no, or category..."
            className="low-stock-search-input"
          />
        </div>

        <div className="low-stock-table-wrapper">
          <table className="low-stock-table">
            <thead>
              <tr>
                <th>Ref No</th>
                <th>Product</th>
                <th className="low-stock-th-category">Category</th>
                <th className="low-stock-th-center">Current Qty</th>
                <th className="low-stock-th-center">Low Stock Threshold</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="low-stock-empty">
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
                    <tr key={item.id} className="low-stock-table-row">
                      <td className="low-stock-ref-no">{item.refNo}</td>
                      <td className="low-stock-product-name">
                        {item.productName}
                      </td>
                      <td className="low-stock-category hidden sm:table-cell">
                        {item.category}
                      </td>
                      <td className="low-stock-quantity-cell">
                        <span
                          className={`low-stock-quantity-badge ${isLow ? "low-stock-badge-warning" : "low-stock-badge-success"}`}
                        >
                          {item.quantity}
                        </span>
                      </td>
                      <td className="low-stock-threshold-cell">
                        <input
                          type="number"
                          value={getThresholdValue(item)}
                          onChange={(e) =>
                            setThresholdEdits({
                              ...thresholdEdits,
                              [item.id]: e.target.value,
                            })
                          }
                          className={`low-stock-threshold-input ${isEdited ? "low-stock-threshold-edited" : ""}`}
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
          <p className="low-stock-unsaved">{unsavedCount} unsaved change(s)</p>
        )}
      </div>
    </div>
  );
}
