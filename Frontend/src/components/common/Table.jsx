import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn, paginate, totalPages } from '../utils/helpers';
import Pagination from './Pagination';

export default function Table({ columns, data, actions, actionsHeader = 'Actions', perPage = 8, sortable = true }) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return sorted;
  }, [data, sortKey, sortDir]);

  const pagedData = useMemo(() => paginate(sortedData, page, perPage), [sortedData, page, perPage]);
  const total = totalPages(sortedData.length, perPage);

  const handleSort = (key) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto card-base">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={cn(
                    'px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap',
                    col.sortable !== false && sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && sortDir === 'asc' && <ArrowUp size={14} />}
                    {sortKey === col.key && sortDir === 'desc' && <ArrowDown size={14} />}
                    {sortKey !== col.key && col.sortable !== false && sortable && <ArrowUpDown size={14} className="text-gray-300" />}
                  </span>
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{actionsHeader}</th>}
            </tr>
          </thead>
          <tbody>
            {pagedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-gray-400">
                  No data available
                </td>
              </tr>
            ) : (
              pagedData.map((row, idx) => (
                <tr
                  key={row.id ?? idx}
                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {col.render ? col.render(row) : (row[col.key] ?? '-')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {sortedData.length > perPage && (
        <Pagination currentPage={page} totalPages={total} onPageChange={setPage} />
      )}
    </div>
  );
}
