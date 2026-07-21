import { useMemo, useState } from "react";
import { Search, Download, Eye, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import ItemDetailsModal from "../components/stock/ItemDetailsModal.jsx";
import EditItemModal from "../components/stock/EditItemModal.jsx";
import DeleteItemModal from "../components/stock/DeleteItemModal.jsx";
import { categories } from "../data/stockData.js";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import "./Stock.css";

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
  const onMenuClick = useMenuClick();
  const { stock: rows, updateStockItem, deleteStockItem } = useInventory();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);

  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => {
      const matchesCategory = category === "All Categories" || r.category === category;
      const matchesQuery =
        !q ||
        r.product.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.refNo.toLowerCase().includes(q) ||
        r.lotNo.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
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
  }, [rows, query, category, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }));
  };

  const handleExport = () => {
    exportToCsv(`stock-${new Date().toISOString().slice(0, 10)}`, CSV_COLUMNS, filtered);
  };

  const handleSaveEdit = (refNo, patch) => {
    updateStockItem(refNo, patch);
    setEditItem(null);
  };

  const handleConfirmDelete = (refNo, options) => {
    deleteStockItem(refNo, options);
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
          </div>

          <button className="stock__btn" onClick={handleExport}>
            <Download size={15} strokeWidth={2.2} />
            Export CSV
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
                  <tr key={row.refNo}>
                    <td className="stock__mono">{row.refNo}</td>
                    <td>
                      <span className={`stock-tag stock-tag--${row.category.toLowerCase()}`}>
                        {row.category}
                      </span>
                    </td>
                    <td>{row.company}</td>
                    <td className="stock__strong">{row.product}</td>
                    <td>{row.size}</td>
                    <td className="stock__mono">{row.lotNo}</td>
                    <td>{row.qty}</td>
                    <td className={isExpiringSoon(row.expiry) ? "stock__expiry-warning" : "stock__expiry"}>
                      {formatDisplayDate(row.expiry)}
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
                        <button
                          className="stock__icon-btn"
                          onClick={() => setEditItem(row)}
                          aria-label={`Edit ${row.refNo}`}
                          title="Edit item"
                        >
                          <Pencil size={15} strokeWidth={2} />
                        </button>
                        <button
                          className="stock__icon-btn stock__icon-btn--danger"
                          onClick={() => setDeleteItem(row)}
                          aria-label={`Delete ${row.refNo}`}
                          title="Delete item"
                        >
                          <Trash2 size={15} strokeWidth={2} />
                        </button>
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
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
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
