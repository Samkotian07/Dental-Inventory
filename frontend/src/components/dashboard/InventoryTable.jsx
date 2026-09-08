import { useMemo, useState } from "react";
import { Search, Maximize2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES as categories, normalizeCategory, isCategoryMatch } from "../utils/constants.js";
import Pagination from "../Pagination.jsx";
import "./InventoryTable.css";

const FULL_VIEW_PAGE_SIZE = 10;

function Rows({ items }) {
  if (items.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="inv-table__empty">
          No products match your search or filter.
        </td>
      </tr>
    );
  }

  return items.map((item) => (
    <tr key={item.refNo || item.id}>
      <td>
        <span className={`inv-table__tag inv-table__tag--${(item.category || "general").toLowerCase()}`}>
          {normalizeCategory(item.category)}
        </span>
      </td>
      <td>{item.company}</td>
      <td>{item.product}</td>
      <td>{item.size || "Standard"}</td>
      <td className="inv-table__ref">{item.refNo || item.id}</td>
      <td style={{ fontWeight: 700, color: "var(--ink)" }}>{item.quantity ?? item.totalQty ?? 0}</td>
    </tr>
  ));
}

export default function InventoryTable({ items = [], activeCategory, onCategoryChange }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [fullViewPage, setFullViewPage] = useState(1);

  const groupedStock = useMemo(() => {
    const groups = {};
    (items || []).forEach((item) => {
      const key = item.refNo || item.ref_no || item.id;
      if (!groups[key]) {
        groups[key] = {
          ...item,
          refNo: item.refNo || item.ref_no || item.id,
          product: item.product || item.productName || item.product_name || "Product",
          company: item.company || item.companyName || item.company_name || "Company",
          quantity: 0,
          totalQty: 0,
        };
      }
      const itemQty = Number(item.quantity ?? item.qty ?? 1);
      groups[key].quantity += itemQty;
      groups[key].totalQty += itemQty;
    });
    return Object.values(groups);
  }, [items]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    categories.forEach((c) => {
      if (c && c !== "All Categories") set.add(c);
    });
    (items || []).forEach((r) => {
      if (r.category) set.add(normalizeCategory(r.category));
    });
    return ["All Categories", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    return groupedStock.filter((item) => {
      const matchesCategory = isCategoryMatch(item.category, activeCategory);
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        (item.product || "").toLowerCase().includes(q) ||
        (item.company || "").toLowerCase().includes(q) ||
        (item.refNo || "").toLowerCase().includes(q) ||
        (item.id || "").toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [groupedStock, activeCategory, query]);

  const totalFullViewPages = Math.max(1, Math.ceil(filtered.length / FULL_VIEW_PAGE_SIZE));
  const currentFullViewPage = Math.min(fullViewPage, totalFullViewPages);
  const fullViewItems = filtered.slice(
    (currentFullViewPage - 1) * FULL_VIEW_PAGE_SIZE,
    currentFullViewPage * FULL_VIEW_PAGE_SIZE
  );
  const visible = filtered.slice(0, 8);

  const controls = (
    <div className="inv-table__controls">
      <div className="inv-table__search">
        <Search size={14} strokeWidth={2.2} />
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFullViewPage(1);
          }}
        />
      </div>
      <select value={activeCategory} onChange={(e) => {
        onCategoryChange(e.target.value);
        setFullViewPage(1);
      }}>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );

  const renderTable = (rowsToRender) => (
    <table className="inv-table__grid">
      <thead>
        <tr>
          <th>Category</th>
          <th>Com Name</th>
          <th>Product</th>
          <th>Size</th>
          <th>Ref No</th>
          <th>Quantity</th>
        </tr>
      </thead>
      <tbody>
        <Rows items={rowsToRender} />
      </tbody>
    </table>
  );

  return (
    <>
      <section className="card inv-table">
        <div className="card__head">
          <h2>Today's Products</h2>
          {controls}
          <button
            className="inv-table__expand"
            onClick={() => {
              setFullViewPage(1);
              setExpanded(true);
            }}
            aria-label="View full table"
            title="View full table"
          >
            <Maximize2 size={15} strokeWidth={2.2} />
          </button>
        </div>

        <div className="inv-table__scroll">{renderTable(visible)}</div>

        {filtered.length > 0 && (
          <button className="inv-table__more" onClick={() => navigate("/stock")}>
            View all {filtered.length} products
          </button>
        )}
      </section>

      {expanded && (
        <div className="inv-modal" role="dialog" aria-modal="true" aria-label="Full inventory table">
          <div className="inv-modal__panel">
            <div className="inv-modal__head">
              <h2>Today's Products — full view</h2>
              <button onClick={() => setExpanded(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="inv-modal__controls">{controls}</div>
            <div className="inv-modal__scroll">{renderTable(fullViewItems)}</div>
            <div className="inv-modal__pagination">
              <Pagination
                page={currentFullViewPage}
                totalPages={totalFullViewPages}
                totalItems={filtered.length}
                pageSize={FULL_VIEW_PAGE_SIZE}
                onPageChange={setFullViewPage}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
