import { useState, useMemo } from "react";
import { Search, Package } from "lucide-react";
import { useData } from "../context/DataContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardHeader from "./dashboard/DashboardHeader.jsx";
import Pagination from "./Pagination.jsx";
import Badge from "./common/Badge.jsx";
import ToggleSwitch from "./common/ToggleSwitch.jsx";
import { formatDate } from "./utils/helpers.js";
import { toast } from "sonner";
import { useMenuClick } from "./Layout.jsx";
import "./StockHandle.css";

const PAGE_SIZE = 8;

export default function StockHandle() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const { inventory, updateInventory } = useData();
  const [searchRef, setSearchRef] = useState("");
  const [foundItem, setFoundItem] = useState(null);
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

  // Toggle item status (Active/Inactive)
  const handleToggleStatus = (itemId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    updateInventory(itemId, { status: newStatus }, user?.name);
    toast.success(`Item status updated to ${newStatus}`);
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
      <DashboardHeader title="Stock Handle" onMenuClick={onMenuClick} />

      <main className="stock-handle">
        <section className="stock-handle__card">
          <div className="sd-search-section">
            <h3 className="sd-section-title">Search Item</h3>
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
                    <p className="sd-found-item-status">
                      Status:{" "}
                      <Badge variant={foundItem.status === "active" ? "success" : "neutral"}>
                        {foundItem.status || "active"}
                      </Badge>
                    </p>
                  </div>
                </div>

                <div className="sd-toggle-section">
                  <div className="sd-toggle-row">
                    <span className="sd-toggle-label">Active Status</span>
                    <ToggleSwitch
                      isOn={foundItem.status !== "inactive"}
                      onToggle={() => {
                        const newStatus = foundItem.status === "inactive" ? "active" : "inactive";
                        updateInventory(foundItem.id, { status: newStatus }, user?.name);
                        setFoundItem({ ...foundItem, status: newStatus });
                        toast.success(`Status updated to ${newStatus}`);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="stock-handle__card">
          <div className="sd-table-header">
            <div>
              <h3 className="sd-section-title">All Items</h3>
              <p className="sd-section-subtitle">
                Browse inventory items and toggle status.
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
                  <th>Status</th>
                  <th className="sd-actions-head">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedInventory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="sd-empty">
                      No items match your search.
                    </td>
                  </tr>
                ) : (
                  pagedInventory.map((item) => {
                    const isActive = item.status !== "inactive";
                    return (
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
                          <Badge variant={isActive ? "success" : "neutral"}>
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td>
                          <div className="sd-action-cell">
                            <ToggleSwitch
                              isOn={isActive}
                              onToggle={() => {
                                const newStatus = isActive ? "inactive" : "active";
                                updateInventory(item.id, { status: newStatus }, user?.name);
                                toast.success(`Status updated to ${newStatus}`);
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
    </>
  );
}