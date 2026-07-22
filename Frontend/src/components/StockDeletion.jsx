import { useState, useMemo } from "react";
import { Search, Trash2, Package, AlertTriangle } from "lucide-react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import Button from "./common/Button";
import Input from "./common/Input";
import Badge from "./common/Badge";
import Table from "./common/Table";
import ConfirmDialog from "./common/ConfirmDialog";
import { DELETE_REASONS } from "./utils/constants";
import { formatDate } from "./utils/helpers";
import { toast } from "sonner";
import "./StockDeletion.css";

export default function StockDeletion() {
  const { user } = useAuth();
  const { inventory, deleteInventory } = useData();
  const [searchRef, setSearchRef] = useState("");
  const [foundItem, setFoundItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("Damaged");
  const [moveToFailed, setMoveToFailed] = useState(true);
  const [search, setSearch] = useState("");

  const handleSearch = () => {
    const item = inventory.find(
      (i) => i.refNo.toLowerCase() === searchRef.toLowerCase(),
    );
    if (item) {
      setFoundItem(item);
    } else {
      setFoundItem(null);
      toast.error("No item found with that Ref No");
    }
  };

  const handleDelete = () => {
    const target = deleteTarget || foundItem;
    if (!target) return;
    deleteInventory(target.id, deleteReason, moveToFailed, user?.name);
    toast.success("Item deleted successfully");
    setDeleteTarget(null);
    setFoundItem(null);
    setSearchRef("");
    setMoveToFailed(true);
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
      render: (i) => <span className="sd-ref-no">{i.refNo}</span>,
    },
    {
      key: "productName",
      label: "Product",
      render: (i) => <span className="sd-product-name">{i.productName}</span>,
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
          className={`sd-quantity ${i.quantity <= 10 ? "sd-quantity-low" : ""}`}
        >
          {i.quantity}
        </span>
      ),
    },
  ];

  return (
    <div className="sd-container">
      {/* Search */}
      <div className="sd-search-section">
        <h3 className="sd-section-title">Search Item to Delete</h3>
        <div className="sd-search-controls">
          <div className="sd-search-input-wrapper">
            <Search size={18} className="sd-search-icon" />
            <input
              type="text"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter Ref No (e.g. INV-001)"
              className="sd-search-input"
            />
          </div>
          <Button onClick={handleSearch} className="sd-search-btn">
            Search
          </Button>
        </div>

        {foundItem && (
          <div className="sd-found-item">
            <div className="sd-found-item-header">
              <div className="sd-found-item-icon">
                <Package size={22} className="sd-found-item-icon-svg" />
              </div>
              <div>
                <p className="sd-found-item-name">{foundItem.productName}</p>
                <p className="sd-found-item-details">
                  {foundItem.refNo} - Qty: {foundItem.quantity} - Expires:{" "}
                  {formatDate(foundItem.expiryDate)}
                </p>
              </div>
            </div>

            <div className="sd-delete-confirm">
              <div className="sd-delete-warning">
                <AlertTriangle size={18} className="sd-delete-warning-icon" />
                <p className="sd-delete-warning-text">
                  Are you sure you want to delete this item?
                </p>
              </div>
              <div className="sd-delete-reason">
                <label className="sd-delete-label">Reason</label>
                <select
                  className="sd-delete-select"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                >
                  {DELETE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <label className="sd-delete-checkbox">
                <input
                  type="checkbox"
                  checked={moveToFailed}
                  onChange={(e) => setMoveToFailed(e.target.checked)}
                />
                Move to Failed Inventory instead of permanent deletion
              </label>
              <div className="sd-delete-actions">
                <Button
                  variant="danger"
                  onClick={() => setDeleteTarget(foundItem)}
                  className="sd-delete-btn"
                >
                  <Trash2 size={16} /> Delete Item
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFoundItem(null);
                    setSearchRef("");
                  }}
                  className="sd-cancel-btn"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* All Items Table */}
      <div className="sd-table-section">
        <div className="sd-table-header">
          <h3 className="sd-section-title">All Items</h3>
          <div className="sd-table-search-wrapper">
            <Search size={16} className="sd-table-search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="sd-table-search-input"
            />
          </div>
        </div>
        <div className="sd-table-wrapper">
          <Table
            columns={columns}
            data={filtered}
            actions={(item) => (
              <button
                onClick={() => {
                  setDeleteTarget(item);
                  setDeleteReason("Damaged");
                  setMoveToFailed(true);
                }}
                className="sd-action-btn sd-action-delete"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            )}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Inventory Item"
        message={`Are you sure you want to delete ${deleteTarget?.productName} (${deleteTarget?.refNo})? ${moveToFailed ? "It will be moved to Failed Inventory." : "This action is permanent."}`}
        confirmLabel="Delete"
      />
    </div>
  );
}
