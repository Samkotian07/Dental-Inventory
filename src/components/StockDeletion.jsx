import { useState, useMemo } from "react";
import { Search, Trash2, Package, AlertTriangle } from "lucide-react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import DashboardHeader from "./dashboard/DashboardHeader.jsx";
import Pagination from "./Pagination.jsx";
import Badge from "./common/Badge";
import ConfirmDialog from "./common/ConfirmDialog";
import { DELETE_REASONS } from "./utils/constants";
import { formatDate } from "./utils/helpers";
import { toast } from "sonner";
import { useMenuClick } from "./Layout.jsx";
import "./StockDeletion.css";

const PAGE_SIZE = 8;

export default function StockDeletion() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const { inventory, deleteInventory } = useData();
  const [searchRef, setSearchRef] = useState("");
  const [foundItem, setFoundItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("Damaged");
  const [moveToFailed, setMoveToFailed] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedInventory = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <>
      <DashboardHeader title="Stock Deletion" onMenuClick={onMenuClick} />

      <main className="stock-deletion">
        <section className="stock-deletion__card">
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
              <button onClick={handleSearch} className="sd-search-btn">
                Search
              </button>
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
                    <button
                      onClick={() => setDeleteTarget(foundItem)}
                      className="sd-delete-btn"
                    >
                      <Trash2 size={16} /> Delete Item
                    </button>
                    <button
                      onClick={() => {
                        setFoundItem(null);
                        setSearchRef("");
                      }}
                      className="sd-cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="stock-deletion__card">
          <div className="sd-table-header">
            <div>
              <h3 className="sd-section-title">All Items</h3>
              <p className="sd-section-subtitle">
                Browse inventory items and select to delete.
              </p>
            </div>
            <div className="sd-table-search-wrapper">
              <Search size={15} strokeWidth={2.2} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search inventory"
                className="sd-table-search-input"
              />
            </div>
          </div>

          <div className="sd-table-scroll">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Ref No</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th className="sd-actions-head">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedInventory.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="sd-empty">
                      No items match your search.
                    </td>
                  </tr>
                ) : (
                  pagedInventory.map((item) => (
                    <tr key={item.id}>
                      <td className="sd-mono">{item.refNo}</td>
                      <td className="sd-product">{item.productName}</td>
                      <td>
                        <Badge variant="primary">{item.category}</Badge>
                      </td>
                      <td>
                        <span
                          className={`sd-quantity ${
                            item.quantity <= 10 ? "sd-quantity-low" : ""
                          }`}
                        >
                          {item.quantity}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setDeleteTarget(item);
                            setDeleteReason("Damaged");
                            setMoveToFailed(true);
                          }}
                          className="sd-icon-btn sd-icon-btn--danger"
                          title="Delete item"
                        >
                          <Trash2 size={15} strokeWidth={2} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </section>
      </main>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Inventory Item"
        message={`Are you sure you want to delete ${deleteTarget?.productName} (${deleteTarget?.refNo})? ${
          moveToFailed
            ? "It will be moved to Failed Inventory."
            : "This action is permanent."
        }`}
        confirmLabel="Delete"
      />
    </>
  );
}
