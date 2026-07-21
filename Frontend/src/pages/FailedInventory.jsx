import { useMemo, useState } from "react";
import { Search, Download, RotateCcw, Trash2, ArrowUpDown, TriangleAlert } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import DisposeConfirmModal from "../components/failed-inventory/DisposeConfirmModal.jsx";
import MoveToInventoryModal from "../components/failed-inventory/MoveToInventoryModal.jsx";
import { categories } from "../data/stockData.js";
import { failReasons } from "../data/failedInventoryData.js";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import "./FailedInventory.css";

const PAGE_SIZE = 6;

const CSV_COLUMNS = [
  { key: "refNo", label: "Ref No" },
  { key: "category", label: "Category" },
  { key: "product", label: "Product" },
  { key: "lotNo", label: "Lot No" },
  { key: "failedDate", label: "Failed Date" },
  { key: "reason", label: "Reason" },
  { key: "qty", label: "Qty" },
  { key: "status", label: "Status" },
];

function formatDisplayDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function FailedInventory() {
  const onMenuClick = useMenuClick();
  const { failed: rows, restoreFailedToStock, markFailedDisposed } = useInventory();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [reason, setReason] = useState("All Reasons");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);

  const [disposeItem, setDisposeItem] = useState(null);
  const [restoreItem, setRestoreItem] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => {
      const matchesCategory = category === "All Categories" || r.category === category;
      const matchesReason = reason === "All Reasons" || r.reason === reason;
      const matchesQuery =
        !q ||
        r.product.toLowerCase().includes(q) ||
        r.refNo.toLowerCase().includes(q) ||
        r.lotNo.toLowerCase().includes(q);
      return matchesCategory && matchesReason && matchesQuery;
    });

    if (sort.key) {
      list = [...list].sort((a, b) => {
        const va = a[sort.key] ?? "";
        const vb = b[sort.key] ?? "";
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * sort.dir;
        return String(va).localeCompare(String(vb)) * sort.dir;
      });
    }

    return list;
  }, [rows, query, category, reason, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }));
  };

  const handleExport = () => {
    exportToCsv(`failed-inventory-${new Date().toISOString().slice(0, 10)}`, CSV_COLUMNS, filtered);
  };

  const handleConfirmDispose = (refNo) => {
    markFailedDisposed(refNo);
    setDisposeItem(null);
  };

  const handleConfirmRestore = (refNo) => {
    restoreFailedToStock(refNo);
    setRestoreItem(null);
  };

  const columns = [
    { key: "refNo", label: "Ref No" },
    { key: "category", label: "Category" },
    { key: "product", label: "Product" },
    { key: "lotNo", label: "Lot No" },
    { key: "failedDate", label: "Failed Date" },
    { key: "reason", label: "Reason" },
    { key: "qty", label: "Qty" },
    { key: "status", label: "Status" },
  ];

  return (
    <>
      <DashboardHeader title="Failed Inventory" onMenuClick={onMenuClick} />

      <main className="failed">
        <div className="failed__banner">
          <TriangleAlert size={16} strokeWidth={2.2} />
          Items listed here have failed quality checks, expired, or been damaged. You can dispose
          of them or restore them to inventory.
        </div>

        <div className="failed__toolbar">
          <div className="failed__filters">
            <div className="failed__search">
              <Search size={14} strokeWidth={2.2} />
              <input
                type="text"
                placeholder="Search by product, ref no, or lot..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
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
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setPage(1);
              }}
            >
              <option>All Reasons</option>
              {failReasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button className="failed__btn" onClick={handleExport}>
            <Download size={15} strokeWidth={2.2} />
            Export
          </button>
        </div>

        <section className="card failed__card">
          <div className="failed__scroll">
            <table className="failed__table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key}>
                      <button className="failed__sort" onClick={() => toggleSort(c.key)}>
                        {c.label}
                        <ArrowUpDown size={11} strokeWidth={2.5} />
                      </button>
                    </th>
                  ))}
                  <th className="failed__actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="failed__empty">
                      No failed inventory items match your search or filter.
                    </td>
                  </tr>
                )}

                {pageRows.map((row) => (
                  <tr key={row.refNo}>
                    <td className="failed__mono">{row.refNo}</td>
                    <td>
                      <span className={`stock-tag stock-tag--${row.category.toLowerCase()}`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="failed__strong">{row.product}</td>
                    <td className="failed__mono">{row.lotNo}</td>
                    <td>{formatDisplayDate(row.failedDate)}</td>
                    <td>
                      <span className="failed-reason-pill">{row.reason}</span>
                    </td>
                    <td>{row.qty}</td>
                    <td>
                      <span className={`failed-status-pill failed-status-pill--${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      {row.status === "failed" && (
                        <div className="failed__row-actions">
                          <button
                            className="failed__icon-btn"
                            onClick={() => setRestoreItem(row)}
                            aria-label={`Restore ${row.refNo} to stock`}
                            title="Restore to inventory"
                          >
                            <RotateCcw size={15} strokeWidth={2} />
                          </button>
                          <button
                            className="failed__icon-btn failed__icon-btn--danger"
                            onClick={() => setDisposeItem(row)}
                            aria-label={`Mark ${row.refNo} disposed`}
                            title="Mark as disposed"
                          >
                            <Trash2 size={15} strokeWidth={2} />
                          </button>
                        </div>
                      )}
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
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </section>
      </main>

      {disposeItem && (
        <DisposeConfirmModal
          item={disposeItem}
          onClose={() => setDisposeItem(null)}
          onConfirm={handleConfirmDispose}
        />
      )}

      {restoreItem && (
        <MoveToInventoryModal
          item={restoreItem}
          onClose={() => setRestoreItem(null)}
          onConfirm={handleConfirmRestore}
        />
      )}
    </>
  );
}
