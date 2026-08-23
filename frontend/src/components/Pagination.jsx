import { ChevronLeft, ChevronRight } from "lucide-react";
import "./Pagination.css";

// Builds a focused 3-page window: < prevpage current page nextpage >
function buildPageList(current, total) {
  const pages = [];
  if (current - 1 >= 1) pages.push(current - 1);
  pages.push(current);
  if (current + 1 <= total) pages.push(current + 1);
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

        {pages.map((p) => (
          <button
            key={p}
            className={`pagination__page ${p === page ? "is-active" : ""}`}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ))}

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
