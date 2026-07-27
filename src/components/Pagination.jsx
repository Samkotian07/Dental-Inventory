import { ChevronLeft, ChevronRight } from "lucide-react";
import "./Pagination.css";

// Builds a compact page list like: 1, 2, 3, …, 8
function buildPageList(current, total) {
  const pages = [];
  const add = (p) => pages.push(p);
  const addEllipsis = () => pages.push("…");

  if (total <= 7) {
    for (let i = 1; i <= total; i++) add(i);
    return pages;
  }

  add(1);
  if (current > 3) addEllipsis();

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) add(i);

  if (current < total - 2) addEllipsis();
  add(total);

  return pages;
}

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const pages = buildPageList(page, totalPages);

  return (
    <div className="pagination">
      <span className="pagination__summary">
        Showing <strong>{from}–{to}</strong> of <strong>{totalItems}</strong>
      </span>

      <div className="pagination__controls">
        <button
          className="pagination__nav"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="pagination__ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`pagination__page ${p === page ? "is-active" : ""}`}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          className="pagination__nav"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
