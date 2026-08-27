import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import "./Pagination.css";

// Builds smart page list with first/last pages and ellipsis: 1 ... 4 5 6 ... 20
function buildSmartPageList(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items = [];
  items.push(1);

  if (current > 3) {
    items.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    items.push(i);
  }

  if (current < total - 2) {
    items.push("...");
  }

  items.push(total);
  return items;
}

export default function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) {
  if (totalItems === 0) return null;

  const from = Math.min((page - 1) * pageSize + 1, totalItems);
  const to = Math.min(page * pageSize, totalItems);
  const pages = buildSmartPageList(page, totalPages);

  return (
    <div className="pagination">
      <div className="pagination__left">
        <span className="pagination__summary">
          Showing <strong>{from}–{to}</strong> of <strong>{totalItems}</strong> items
        </span>
        {onPageSizeChange && (
          <div className="pagination__size">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination__controls">
          <button
            className="pagination__nav"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            aria-label="First page"
            title="First page"
          >
            <ChevronsLeft size={15} />
          </button>

          <button
            className="pagination__nav"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft size={15} />
          </button>

          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="pagination__ellipsis">
                  •••
                </span>
              );
            }
            return (
              <button
                key={p}
                className={`pagination__page ${p === page ? "is-active" : ""}`}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            );
          })}

          <button
            className="pagination__nav"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight size={15} />
          </button>

          <button
            className="pagination__nav"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            aria-label="Last page"
            title="Last page"
          >
            <ChevronsRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
