import { useMemo, useState } from "react";
import { Search, Maximize2, X } from "lucide-react";
import { categories } from "../../data/dashboardData.js";
import "./InventoryTable.css";

function Rows({ items }) {
  if (items.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="inv-table__empty">
          No items match your search or filter.
        </td>
      </tr>
    );
  }

  return items.map((item) => (
    <tr key={item.id}>
      <td>
        <span className={`inv-table__tag inv-table__tag--${item.category.toLowerCase()}`}>
          {item.category}
        </span>
      </td>
      <td>{item.company}</td>
      <td>{item.product}</td>
      <td>{item.size}</td>
      <td className="inv-table__ref">{item.id}</td>
    </tr>
  ));
}

export default function InventoryTable({ items, activeCategory, onCategoryChange }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = activeCategory === "All Categories" || item.category === activeCategory;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.product.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [items, activeCategory, query]);

  const visible = expanded ? filtered : filtered.slice(0, 7);

  const controls = (
    <div className="inv-table__controls">
      <div className="inv-table__search">
        <Search size={14} strokeWidth={2.2} />
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <select value={activeCategory} onChange={(e) => onCategoryChange(e.target.value)}>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );

  const table = (
    <table className="inv-table__grid">
      <thead>
        <tr>
          <th>Category</th>
          <th>Com Name</th>
          <th>Product</th>
          <th>Size</th>
          <th>Ref No</th>
        </tr>
      </thead>
      <tbody>
        <Rows items={visible} />
      </tbody>
    </table>
  );

  return (
    <>
      <section className="card inv-table">
        <div className="card__head">
          <h2>Today's Inventory</h2>
          {controls}
          <button
            className="inv-table__expand"
            onClick={() => setExpanded(true)}
            aria-label="View full table"
            title="View full table"
          >
            <Maximize2 size={15} strokeWidth={2.2} />
          </button>
        </div>

        <div className="inv-table__scroll">{table}</div>

        {!expanded && filtered.length > visible.length && (
          <button className="inv-table__more" onClick={() => setExpanded(true)}>
            View all {filtered.length} items
          </button>
        )}
      </section>

      {expanded && (
        <div className="inv-modal" role="dialog" aria-modal="true" aria-label="Full inventory table">
          <div className="inv-modal__panel">
            <div className="inv-modal__head">
              <h2>Today's Inventory — full view</h2>
              <button onClick={() => setExpanded(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="inv-modal__controls">{controls}</div>
            <div className="inv-modal__scroll">{table}</div>
          </div>
        </div>
      )}
    </>
  );
}
