import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/helpers';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = [];
  if (currentPage - 1 >= 1) pages.push(currentPage - 1);
  pages.push(currentPage);
  if (currentPage + 1 <= totalPages) pages.push(currentPage + 1);

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={18} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition',
              p === currentPage
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
