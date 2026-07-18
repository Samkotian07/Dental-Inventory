import { useMemo, useState } from "react";
import { Search, Download, Plus, Eye, RefreshCw, Trash2, ArrowUpDown } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import ExchangeDetailsModal from "../components/track-exchange/ExchangeDetailsModal.jsx";
import UpdateStatusModal from "../components/track-exchange/UpdateStatusModal.jsx";
import AddExchangeModal from "../components/track-exchange/AddExchangeModal.jsx";
import DiscardConfirmModal from "../components/track-exchange/DiscardConfirmModal.jsx";
import { exchangeItems as seedData, students } from "../data/exchangeData.js";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import "./TrackExchange.css";

const PAGE_SIZE = 6;

const CSV_COLUMNS = [
  { key: "exchangeId", label: "Exchange ID" },
  { key: "student", label: "Student" },
  { key: "studentId", label: "Student ID" },
  { key: "refNo", label: "Item (Ref No)" },
  { key: "creditNo", label: "Credit No" },
  { key: "reason", label: "Reason" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
];

function formatDate(isoOrDate) {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function TrackExchange() {
  const onMenuClick = useMenuClick();

  const [rows, setRows] = useState(seedData);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);

  const [detailItem, setDetailItem] = useState(null);
  const [statusItem, setStatusItem] = useState(null);
  const [discardItem, setDiscardItem] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => {
      const matchesStatus = status === "All Status" || r.status === status;
      const matchesQuery =
        !q ||
        r.exchangeId.toLowerCase().includes(q) ||
        r.refNo.toLowerCase().includes(q) ||
        r.creditNo.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.student.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
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
  }, [rows, query, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }));
  };

  const handleExport = () => {
    exportToCsv(`track-exchange-${new Date().toISOString().slice(0, 10)}`, CSV_COLUMNS, filtered);
  };

  const handleUpdateStatus = (exchangeId, newStatus) => {
    setRows((prev) =>
      prev.map((r) => (r.exchangeId === exchangeId ? { ...r, status: newStatus } : r))
    );
    setStatusItem(null);
  };

  const handleDiscard = (exchangeId) => {
    setRows((prev) => prev.filter((r) => r.exchangeId !== exchangeId));
    setDiscardItem(null);
  };

  const handleAddExchange = ({ studentId, itemId, reason, creditNo, date }) => {
    const student = students.find((s) => s.id === studentId);
    const nextNum = rows.length + 1;
    const newRow = {
      exchangeId: `EXC-${String(nextNum).padStart(3, "0")}`,
      studentId,
      student: student?.name ?? studentId,
      refNo: itemId,
      creditNo,
      reason,
      date: formatDate(date),
      status: "Pending",
    };
    setRows((prev) => [newRow, ...prev]);
    setAddModalOpen(false);
    setPage(1);
  };

  const columns = [
    { key: "exchangeId", label: "Exchange ID" },
    { key: "refNo", label: "Item (Ref No)" },
    { key: "creditNo", label: "Credit No" },
    { key: "reason", label: "Reason" },
    { key: "date", label: "Date" },
    { key: "status", label: "Status" },
  ];

  return (
    <>
      <DashboardHeader title="Track Exchange" onMenuClick={onMenuClick} />

      <main className="exchange">
        <div className="exchange__toolbar">
          <div className="exchange__filters">
            <div className="exchange__search">
              <Search size={14} strokeWidth={2.2} />
              <input
                type="text"
                placeholder="Search by exchange ID, item, or reason..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option>All Status</option>
              <option>Pending</option>
              <option>Completed</option>
              <option>Rejected</option>
            </select>
          </div>

          <div className="exchange__actions">
            <button className="exchange__btn" onClick={handleExport}>
              <Download size={15} strokeWidth={2.2} />
              Export
            </button>
            <button className="exchange__btn exchange__btn--primary" onClick={() => setAddModalOpen(true)}>
              <Plus size={15} strokeWidth={2.4} />
              Add Exchange
            </button>
          </div>
        </div>

        <section className="card exchange__card">
          <div className="exchange__scroll">
            <table className="exchange__table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key}>
                      <button className="exchange__sort" onClick={() => toggleSort(c.key)}>
                        {c.label}
                        <ArrowUpDown size={11} strokeWidth={2.5} />
                      </button>
                    </th>
                  ))}
                  <th className="exchange__actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="exchange__empty">
                      No exchange records match your search or filter.
                    </td>
                  </tr>
                )}

                {pageRows.map((row) => (
                  <tr key={row.exchangeId}>
                    <td className="exchange__mono">{row.exchangeId}</td>
                    <td className="exchange__mono">{row.refNo}</td>
                    <td className="exchange__mono">{row.creditNo}</td>
                    <td>{row.reason}</td>
                    <td>{row.date}</td>
                    <td>
                      <span className={`exch-status-pill exch-status-pill--${row.status.toLowerCase()}`}>
                        {row.status.toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <div className="exchange__row-actions">
                        <button
                          className="exchange__icon-btn"
                          onClick={() => setDetailItem(row)}
                          aria-label={`View ${row.exchangeId}`}
                          title="View details"
                        >
                          <Eye size={16} strokeWidth={2} />
                        </button>

                        {row.status !== "Completed" && (
                          <button
                            className="exchange__icon-btn"
                            onClick={() => setStatusItem(row)}
                            aria-label={`Update status for ${row.exchangeId}`}
                            title="Update status"
                          >
                            <RefreshCw size={15} strokeWidth={2} />
                          </button>
                        )}

                        {row.status === "Completed" && (
                          <button
                            className="exchange__icon-btn exchange__icon-btn--danger"
                            onClick={() => setDiscardItem(row)}
                            aria-label={`Discard ${row.exchangeId}`}
                            title="Discard record"
                          >
                            <Trash2 size={15} strokeWidth={2} />
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
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </section>
      </main>

      {detailItem && <ExchangeDetailsModal item={detailItem} onClose={() => setDetailItem(null)} />}

      {statusItem && (
        <UpdateStatusModal
          item={statusItem}
          onClose={() => setStatusItem(null)}
          onConfirm={handleUpdateStatus}
        />
      )}

      {discardItem && (
        <DiscardConfirmModal
          item={discardItem}
          onClose={() => setDiscardItem(null)}
          onConfirm={handleDiscard}
        />
      )}

      {addModalOpen && (
        <AddExchangeModal onClose={() => setAddModalOpen(false)} onConfirm={handleAddExchange} />
      )}
    </>
  );
}
