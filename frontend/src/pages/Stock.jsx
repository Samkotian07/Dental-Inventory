import { useEffect, useMemo, useState } from "react";
import { Search, Download, Eye, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import ItemDetailsModal from "../components/stock/ItemDetailsModal.jsx";
import EditItemModal from "../components/stock/EditItemModal.jsx";
import DeleteItemModal from "../components/stock/DeleteItemModal.jsx";
import { CATEGORIES as categories, normalizeCategory, isCategoryMatch } from "../components/utils/constants.js";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useInventory } from "../context/InventoryContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "sonner";
import "./css/Stock.css";

const PAGE_SIZE = 8;
const EXPIRY_WARNING_DAYS = 365;

const CSV_COLUMNS = [
  { key: "refNo", label: "Ref No" },
  { key: "category", label: "Category" },
  { key: "company", label: "Company" },
  { key: "product", label: "Product" },
  { key: "size", label: "Size" },
  { key: "lotNo", label: "Lot No" },
  { key: "qty", label: "Qty" },
  { key: "expiry", label: "Expiry" },
  { key: "returnedCount", label: "Returned" },
];

function formatDisplayDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function isExpiringSoon(iso) {
  if (!iso) return false;
  const expiry = new Date(iso);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + EXPIRY_WARNING_DAYS);
  return expiry <= cutoff;
}

export default function Stock() {
  const navigate = useNavigate();
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const canWrite = user?.role !== 'readonly';
  const isAdmin = user?.role === 'admin';

  const {
    stock: rows,
    moveToFailed,
    getLotsForRef,
    updateStockQuantity,
  } = useInventory();

  const [query, setQuery] = useState("");
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState("All Categories");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    setQuery(searchParams.get("search") || "");
    setPage(1);
  }, [searchParams]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    categories.forEach((c) => {
      if (c && c !== "All Categories") set.add(c);
    });
    (rows || []).forEach((r) => {
      if (r.category && r.lotNo && String(r.lotNo).trim() !== "" && Number(r.quantity ?? r.qty ?? 0) > 0) {
        set.add(normalizeCategory(r.category));
      }
    });
    return ["All Categories", ...Array.from(set)];
  }, [rows]);

  // ⭐ Group by base ref_no and count returned units
  const filtered = useMemo(() => {
    let q = query.trim().toLowerCase();
    if (q.includes("/unit-history/")) {
      q = q.split("/unit-history/").pop().split("?")[0].split("#")[0];
    } else if (q.includes("/scan/")) {
      q = q.split("/scan/").pop().split("?")[0].split("#")[0];
    }

    let filteredItems = (rows || []).filter((r) => {
      if (!r.lotNo || String(r.lotNo).trim() === "") return false;
      const available = Number(r.quantity ?? r.qty ?? 0);
      if (available <= 0) return false;
      const matchesCategory = isCategoryMatch(r.category, category);
      const matchesQuery =
        !q ||
        (r.product || "").toLowerCase().includes(q) ||
        (r.company || "").toLowerCase().includes(q) ||
        (r.refNo || "").toLowerCase().includes(q) ||
        (r.size || "").toLowerCase().includes(q) ||
        (r.lotNo || "").toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });

    // Group by base ref_no
    const groupedMap = {};
    filteredItems.forEach((r) => {
      const rawRef = r.refNo || r.id || "";
      const baseRef = /^[A-Z0-9]+-[0-9]+[A-Z]$/i.test(rawRef) ? rawRef.slice(0, -1) : rawRef;
      const key = baseRef || (r.product || "").toLowerCase();

      if (!groupedMap[key]) {
        groupedMap[key] = {
          ...r,
          refNo: baseRef,
          quantity: 0,
          qty: 0,
          returnedCount: 0,
          units: []
        };
      }
      const unitQty = Number(r.quantity ?? r.qty ?? 0);
      groupedMap[key].quantity += unitQty;
      groupedMap[key].qty += unitQty;
      // ⭐ Count returned units
      if (r.isReturned === true) {
        groupedMap[key].returnedCount += unitQty;
      }
      groupedMap[key].units.push(r.id);
    });

    let list = Object.values(groupedMap).filter((item) => Number(item.quantity ?? item.qty ?? 0) > 0);

    if (sort.key) {
      list = [...list].sort((a, b) => {
        const va = a[sort.key] ?? "";
        const vb = b[sort.key] ?? "";
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * sort.dir;
        return String(va).localeCompare(String(vb)) * sort.dir;
      });
    }

    return list;
  }, [rows, query, category, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }));
  };

  const handleExport = () => {
    exportToCsv(`stock-${new Date().toISOString().slice(0, 10)}`, CSV_COLUMNS, filtered);
  };

  const getProductUnits = (refNo) => {
    return rows.filter(r => {
      const rawRef = r.refNo || r.id || "";
      const baseRef = /^[A-Z0-9]+-[0-9]+[A-Z]$/i.test(rawRef) ? rawRef.slice(0, -1) : rawRef;
      return baseRef === refNo || r.refNo === refNo || r.id === refNo;
    });
  };

  const handleSaveEdit = async (refNo, patch) => {
    const newQty = Number(patch.qty);
    if (!newQty || newQty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (!patch.reason || !patch.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    const result = await updateStockQuantity(refNo, newQty, patch.reason.trim());
    if (result.success) {
      toast.success(result.data?.delta === 0 ? "No change" : `Quantity updated to ${newQty}`);
      setEditItem(null);
    } else {
      toast.error(result.message || "Failed to update quantity");
    }
  };

  const handleConfirmDelete = async (refNo, options) => {
    const qtyRequested = Number(options?.quantity ?? 1);
    const reason = options?.reason || "Damaged";

    let failureType = "damaged";
    const rLower = reason.toLowerCase();
    if (rLower.includes("expire")) failureType = "expired";
    else if (rLower.includes("qualit")) failureType = "quality_fail";
    else if (rLower.includes("condemn")) failureType = "condemned";

    let lots = await getLotsForRef(refNo);
    if (!lots || lots.length === 0) {
      const match = rows.find(r => (r.refNo || r.id) === refNo);
      if (match?.lotId) {
        lots = [{ lotId: match.lotId, qtyAvailable: Number(match.quantity ?? match.qty ?? 0) }];
      }
    }

    if (!lots || lots.length === 0) {
      toast.error("No active lots found for this product to move to failed");
      setDeleteItem(null);
      return;
    }

    let remainingToMove = qtyRequested;
    let successCount = 0;

    for (const lot of lots) {
      if (remainingToMove <= 0) break;
      const lotQty = Number(lot.qtyAvailable ?? lot.quantity ?? 0);
      if (lotQty <= 0) continue;
      const moveQty = Math.min(lotQty, remainingToMove);

      const result = await moveToFailed({
        lotId: lot.lotId,
        quantity: moveQty,
        failureType,
        failureReason: reason,
      });

      if (result.success) {
        successCount += moveQty;
        remainingToMove -= moveQty;
      }
    }

    if (successCount > 0) {
      toast.success(`Moved ${successCount} unit(s) to Failed Inventory`);
    } else {
      toast.error("Failed to move item(s) to Failed Inventory");
    }
    setDeleteItem(null);
  };

  const columns = [
    { key: "refNo", label: "Ref No" },
    { key: "category", label: "Category" },
    { key: "company", label: "Company" },
    { key: "product", label: "Product" },
    { key: "size", label: "Size" },
    { key: "lotNo", label: "Lot No" },
    { key: "qty", label: "QTY" },
    { key: "expiry", label: "Expiry" },
    { key: "returnedCount", label: "Returned" },
  ];

  return (
    <>
      <DashboardHeader title="Stock" onMenuClick={onMenuClick} />

      <main className="stock">
        <div className="stock__toolbar">
          <div className="stock__filters">
            <div className="stock__search">
              <Search size={14} strokeWidth={2.2} />
              <input
                type="text"
                placeholder="Search by product, company, ref no, or lot..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    let val = query.trim();
                    if (val.includes("/unit-history/")) {
                      val = val.split("/unit-history/").pop().split("?")[0].split("#")[0];
                    } else if (val.includes("/scan/")) {
                      val = val.split("/scan/").pop().split("?")[0].split("#")[0];
                    }
                    if (val) {
                      navigate(`/unit-history/${encodeURIComponent(val)}`);
                    }
                  }
                }}
              />
            </div>

            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button className="stock__btn" onClick={handleExport}>
            <Download size={15} strokeWidth={2.2} />
            Export
          </button>
        </div>

        <section className="card stock__card">
          <div className="stock__scroll">
            <table className="stock__table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key}>
                      <button className="stock__sort" onClick={() => toggleSort(c.key)}>
                        {c.label}
                        <ArrowUpDown size={11} strokeWidth={2.5} />
                      </button>
                    </th>
                  ))}
                  <th className="stock__actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="stock__empty">
                      No stock items match your search or filter.
                    </td>
                  </tr>
                )}

                {pageRows.map((row) => (
                  <tr
                    key={row.refNo || row.id}
                    className={row.status === "inactive" || row.isActive === false ? "stock__row--inactive" : ""}
                  >
                    <td className="stock__mono">{row.refNo}</td>
                    <td>
                      <span className={`stock-tag stock-tag--${(row.category || "general").toLowerCase()}`}>
                        {row.category || "General"}
                      </span>
                    </td>
                    <td>{row.company}</td>
                    <td className="stock__strong">{row.product}</td>
                    <td>{row.size || "—"}</td>
                    <td className="stock__mono">{row.lotNo}</td>
                    <td>{row.qty}</td>
                    <td className={isExpiringSoon(row.expiry) ? "stock__expiry-warning" : "stock__expiry"}>
                      {formatDisplayDate(row.expiry)}
                    </td>
                    <td>
                      {row.returnedCount > 0 ? (
                        <span className="returned-badge">
                          🔄 {row.returnedCount} unit{row.returnedCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="fresh-badge">📦 Fresh</span>
                      )}
                    </td>
                    <td>
                      <div className="stock__row-actions">
                        <button
                          className="stock__icon-btn"
                          onClick={() => setDetailItem(row)}
                          aria-label={`View ${row.refNo}`}
                          title="View details"
                        >
                          <Eye size={16} strokeWidth={2} />
                        </button>
                        {isAdmin && (
                          <button
                            className="stock__icon-btn"
                            onClick={() => setEditItem(row)}
                            aria-label={`Edit ${row.refNo}`}
                            title="Edit item"
                          >
                            <Pencil size={16} strokeWidth={2} />
                          </button>
                        )}
                        {canWrite && (
                          <button
                            className="stock__icon-btn stock__icon-btn--danger"
                            onClick={() => setDeleteItem(row)}
                            aria-label={`Move ${row.refNo} to failed`}
                            title="Move to Failed"
                          >
                            <Trash2 size={16} strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </section>
      </main>

      {detailItem && <ItemDetailsModal item={detailItem} onClose={() => setDetailItem(null)} />}

      {editItem && (
        <EditItemModal item={editItem} onClose={() => setEditItem(null)} onSave={handleSaveEdit} />
      )}

      {deleteItem && (
        <DeleteItemModal
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}