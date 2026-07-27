import { useMemo, useState } from "react";
import { Search, Edit, Save, History } from "lucide-react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import DashboardHeader from "./dashboard/DashboardHeader.jsx";
import Pagination from "./Pagination.jsx";
import Badge from "./common/Badge";
import { useMenuClick } from "./Layout.jsx";
import { CATEGORIES } from "./utils/constants";
import { formatDate } from "./utils/helpers";
import { toast } from "sonner";
import "./InventoryUpdation.css";

const PAGE_SIZE = 8;

export default function InventoryUpdation() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const { inventory, updateInventory, auditLog } = useData();
  const [searchRef, setSearchRef] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const handleSearch = () => {
    const searchValue = searchRef.trim();
    const item = inventory.find(
      (i) => i.refNo.toLowerCase() === searchValue.toLowerCase(),
    );

    if (item) {
      setEditItem({ ...item });
      setPage(1);
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
    const query = search.trim().toLowerCase();

    return inventory.filter((item) => {
      const matchesQuery =
        !query ||
        item.refNo.toLowerCase().includes(query) ||
        item.productName.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesQuery;
    });
  }, [inventory, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedInventory = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const recentUpdates = auditLog
    .filter((entry) => entry.action === "UPDATE" || entry.action === "CREATE")
    .slice(0, 5);

  return (
    <>
      <DashboardHeader title="Inventory Update" onMenuClick={onMenuClick} />

      <main className="inventory-updation">
        <section className="inventory-updation__toolbar">
          <div className="inventory-updation__search">
            <Search size={16} strokeWidth={2.2} />
            <input
              type="text"
              value={searchRef}
              onChange={(event) => setSearchRef(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
              placeholder="Find an item by Ref No"
            />
          </div>

          <button className="inventory-updation__btn inventory-updation__btn--primary" onClick={handleSearch}>
            Search Item
          </button>
        </section>

        {editItem && (
          <section className="inventory-updation__card inventory-updation__card--edit">
            <div className="inventory-updation__card-header">
              <div>
                <h3 className="inventory-updation__section-title">Update Item</h3>
                <p className="inventory-updation__section-subtitle">
                  Editing {editItem.refNo}
                </p>
              </div>
              <span className="inventory-updation__pill">Active</span>
            </div>

            <div className="inventory-updation__edit-grid">
              <label className="inventory-updation__field">
                <span>Category</span>
                <select
                  value={editItem.category}
                  onChange={(event) =>
                    setEditItem({ ...editItem, category: event.target.value })
                  }
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inventory-updation__field">
                <span>Company Name</span>
                <input
                  value={editItem.companyName || ""}
                  onChange={(event) =>
                    setEditItem({ ...editItem, companyName: event.target.value })
                  }
                />
              </label>

              <label className="inventory-updation__field">
                <span>Product Name</span>
                <input
                  value={editItem.productName || ""}
                  onChange={(event) =>
                    setEditItem({ ...editItem, productName: event.target.value })
                  }
                />
              </label>

              <label className="inventory-updation__field">
                <span>Size</span>
                <input
                  value={editItem.size || ""}
                  onChange={(event) =>
                    setEditItem({ ...editItem, size: event.target.value })
                  }
                />
              </label>

              <label className="inventory-updation__field">
                <span>Lot No</span>
                <input
                  value={editItem.lotNo || ""}
                  onChange={(event) =>
                    setEditItem({ ...editItem, lotNo: event.target.value })
                  }
                />
              </label>

              <label className="inventory-updation__field">
                <span>Quantity</span>
                <input
                  type="number"
                  value={editItem.quantity || 0}
                  onChange={(event) =>
                    setEditItem({ ...editItem, quantity: Number(event.target.value) })
                  }
                />
              </label>

              <label className="inventory-updation__field">
                <span>Expiry Date</span>
                <input
                  type="date"
                  value={editItem.expiryDate || ""}
                  onChange={(event) =>
                    setEditItem({ ...editItem, expiryDate: event.target.value })
                  }
                />
              </label>
            </div>

            <div className="inventory-updation__actions">
              <button className="inventory-updation__btn inventory-updation__btn--primary" onClick={handleSave}>
                <Save size={15} strokeWidth={2.2} />
                Update Item
              </button>
            </div>
          </section>
        )}

        <section className="inventory-updation__card inventory-updation__card--table">
          <div className="inventory-updation__table-toolbar">
            <div>
              <h3 className="inventory-updation__section-title">Inventory Items</h3>
              <p className="inventory-updation__section-subtitle">
                Browse the stock list and open any record for quick updates.
              </p>
            </div>

            <div className="inventory-updation__table-search">
              <Search size={15} strokeWidth={2.2} />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search inventory"
              />
            </div>
          </div>

          <div className="inventory-updation__table-scroll">
            <table className="inventory-updation__table">
              <thead>
                <tr>
                  <th>Ref No</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedInventory.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="inventory-updation__empty">
                      No inventory items match your search.
                    </td>
                  </tr>
                ) : (
                  pagedInventory.map((item) => (
                    <tr key={item.id}>
                      <td className="inventory-updation__mono">{item.refNo}</td>
                      <td className="inventory-updation__product">{item.productName}</td>
                      <td>
                        <Badge variant="primary">{item.category}</Badge>
                      </td>
                      <td>
                        <span className={`inventory-updation__quantity ${item.quantity <= 10 ? "is-low" : ""}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td>
                        <button
                          className="inventory-updation__icon-btn"
                          onClick={() => setEditItem({ ...item })}
                          title="Edit item"
                        >
                          <Edit size={15} strokeWidth={2} />
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

        <section className="inventory-updation__card inventory-updation__card--audit">
          <div className="inventory-updation__card-header">
            <div>
              <h3 className="inventory-updation__section-title">Recent Updates</h3>
              <p className="inventory-updation__section-subtitle">
                Latest inventory actions from the team.
              </p>
            </div>
            <div className="inventory-updation__pill inventory-updation__pill--muted">
              <History size={14} strokeWidth={2.2} />
              <span>{recentUpdates.length}</span>
            </div>
          </div>

          <div className="inventory-updation__audit-list">
            {recentUpdates.length === 0 ? (
              <p className="inventory-updation__empty inventory-updation__empty--soft">
                No recent updates yet.
              </p>
            ) : (
              recentUpdates.map((entry) => (
                <div key={entry.id} className="inventory-updation__audit-item">
                  <Badge variant={entry.action === "CREATE" ? "success" : "primary"}>
                    {entry.action}
                  </Badge>
                  <p>{entry.details}</p>
                  <span>{formatDate(entry.timestamp, "MMM dd, HH:mm")}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}
