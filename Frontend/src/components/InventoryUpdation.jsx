import { useState, useMemo } from "react";
import { Search, Edit, Save, History } from "lucide-react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import Button from "./common/Button";
import Input from "./common/Input";
import Badge from "./common/Badge";
import Table from "./common/Table";
import { CATEGORIES } from "./utils/constants"; 
import { formatDate } from "./utils/helpers"; 
import { toast } from "sonner";
import "./InventoryUpdation.css";

export default function InventoryUpdation() {
  const { user } = useAuth();
  const { inventory, updateInventory, auditLog } = useData();
  const [searchRef, setSearchRef] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState("");

  const handleSearch = () => {
    const item = inventory.find(
      (i) => i.refNo.toLowerCase() === searchRef.toLowerCase(),
    );
    if (item) {
      setEditItem({ ...item });
    } else {
      toast.error("No item found with that Ref No");
      setEditItem(null);
    }
  };

  const handleSave = () => {
    updateInventory(editItem.id, editItem, user?.name);
    toast.success("Inventory item updated successfully");
    setEditItem(null);
    setSearchRef("");
  };

  const filtered = useMemo(() => {
    return inventory.filter(
      (i) =>
        !search ||
        i.refNo.toLowerCase().includes(search.toLowerCase()) ||
        i.productName.toLowerCase().includes(search.toLowerCase()),
    );
  }, [inventory, search]);

  const columns = [
    {
      key: "refNo",
      label: "Ref No",
      render: (i) => <span className="inv-ref-no">{i.refNo}</span>,
    },
    {
      key: "productName",
      label: "Product",
      render: (i) => <span className="inv-product-name">{i.productName}</span>,
    },
    {
      key: "category",
      label: "Category",
      render: (i) => <Badge variant="primary">{i.category}</Badge>,
    },
    {
      key: "quantity",
      label: "Qty",
      render: (i) => (
        <span
          className={`inv-quantity ${i.quantity <= 10 ? "inv-quantity-low" : ""}`}
        >
          {i.quantity}
        </span>
      ),
    },
  ];

  const recentUpdates = auditLog
    .filter((a) => a.action === "UPDATE" || a.action === "CREATE")
    .slice(0, 5);

  return (
    <div className="inventory-updation">
      {/* Search Section */}
      <div className="inv-search-section">
        <h3 className="inv-section-title">Search Item to Update</h3>
        <div className="inv-search-controls">
          <div className="inv-search-input-wrapper">
            <Search size={18} className="inv-search-icon" />
            <input
              type="text"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter Ref No (e.g. INV-001)"
              className="inv-search-input"
            />
          </div>
          <Button onClick={handleSearch} className="inv-search-btn">
            Search
          </Button>
        </div>

        {editItem && (
          <div className="inv-edit-section">
            <h4 className="inv-edit-title">Edit Item: {editItem.refNo}</h4>
            <div className="inv-edit-grid">
              <div className="inv-edit-field">
                <label className="inv-edit-label">Category</label>
                <select
                  className="inv-edit-select"
                  value={editItem.category}
                  onChange={(e) =>
                    setEditItem({ ...editItem, category: e.target.value })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Company Name"
                value={editItem.companyName}
                onChange={(e) =>
                  setEditItem({ ...editItem, companyName: e.target.value })
                }
                className="inv-edit-input"
              />
              <Input
                label="Product Name"
                value={editItem.productName}
                onChange={(e) =>
                  setEditItem({ ...editItem, productName: e.target.value })
                }
                className="inv-edit-input"
              />
              <Input
                label="Size"
                value={editItem.size}
                onChange={(e) =>
                  setEditItem({ ...editItem, size: e.target.value })
                }
                className="inv-edit-input"
              />
              <Input
                label="Lot No"
                value={editItem.lotNo}
                onChange={(e) =>
                  setEditItem({ ...editItem, lotNo: e.target.value })
                }
                className="inv-edit-input"
              />
              <Input
                label="Quantity"
                type="number"
                value={editItem.quantity}
                onChange={(e) =>
                  setEditItem({ ...editItem, quantity: Number(e.target.value) })
                }
                className="inv-edit-input"
              />
              <Input
                label="Expiry Date"
                type="date"
                value={editItem.expiryDate}
                onChange={(e) =>
                  setEditItem({ ...editItem, expiryDate: e.target.value })
                }
                className="inv-edit-input"
              />
            </div>
            <div className="inv-edit-actions">
              <Button onClick={handleSave} className="inv-update-btn">
                <Save size={16} /> Update Item
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* All Items Table */}
      <div className="inv-table-section">
        <div className="inv-table-header">
          <h3 className="inv-section-title">All Items</h3>
          <div className="inv-table-search-wrapper">
            <Search size={16} className="inv-table-search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="inv-table-search-input"
            />
          </div>
        </div>
        <div className="inv-table-wrapper">
          <Table
            columns={columns}
            data={filtered}
            actions={(item) => (
              <button
                onClick={() => setEditItem({ ...item })}
                className="inv-action-btn inv-action-edit"
                title="Edit"
              >
                <Edit size={16} />
              </button>
            )}
          />
        </div>
      </div>

      {/* Audit Trail */}
      <div className="inv-audit-section">
        <div className="inv-audit-header">
          <History size={18} className="inv-audit-icon" />
          <h3 className="inv-section-title">Recent Updates</h3>
        </div>
        <div className="inv-audit-list">
          {recentUpdates.length === 0 ? (
            <p className="inv-audit-empty">No recent updates</p>
          ) : (
            recentUpdates.map((entry) => (
              <div key={entry.id} className="inv-audit-item">
                <Badge
                  variant={entry.action === "CREATE" ? "success" : "primary"}
                >
                  {entry.action}
                </Badge>
                <p className="inv-audit-details">{entry.details}</p>
                <p className="inv-audit-time">
                  {formatDate(entry.timestamp, "MMM dd, HH:mm")}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
