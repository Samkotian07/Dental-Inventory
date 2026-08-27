import { useMemo, useState } from "react";
import { Search, Download, Plus, Eye, RefreshCw, Trash2, ArrowUpDown } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import ReturnDetailsModal from "../components/track-exchange/ReturnDetailsModal.jsx";
import UpdateStatusModal from "../components/track-exchange/UpdateStatusModal.jsx";
import AddReturnModal from "../components/track-exchange/AddReturnModal.jsx";
import DiscardConfirmModal from "../components/track-exchange/DiscardConfirmModal.jsx";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import "./css/TrackExchange.css";

const PAGE_SIZE = 6;

const CSV_COLUMNS = [
  { key: "returnId", label: "Return ID" },
  { key: "refNo", label: "Item (Ref No)" },
  { key: "productName", label: "Product" },
  { key: "quantity", label: "Quantity" },
  { key: "reason", label: "Reason" },
  { key: "creditNo", label: "Credit Note" },
  { key: "returnDate", label: "Return Date" },
  { key: "status", label: "Status" },
];

function formatDate(isoOrDate) {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function TrackReturns() {
  const onMenuClick = useMenuClick();
  const { returns, addReturn, updateReturnStatus, discardReturn } = useInventory();

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
    let list = (returns || rows || []).filter((r) => {
      const matchesStatus = status === "All Status" || r.status === status;
      const matchesQuery =
        !q ||
        (r.returnId || "").toLowerCase().includes(q) ||
        (r.refNo || "").toLowerCase().includes(q) ||
        (r.creditNo || r.creditNote || "").toLowerCase().includes(q) ||
        (r.reason || "").toLowerCase().includes(q) ||
        (r.productName || r.product || "").toLowerCase().includes(q);
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
  }, [returns, query, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }));
  };

  const handleExport = () => {
    exportToCsv(`track-returns-${new Date().toISOString().slice(0, 10)}`, CSV_COLUMNS, filtered);
  };

  const handleUpdateStatus = (returnId, newStatus) => {
    setRows((prev) =>
      prev.map((r) => (r.returnId === returnId ? { ...r, status: newStatus } : r))
    );
    setStatusItem(null);
  };

  const handleDiscard = (returnId) => {
    setRows((prev) => prev.filter((r) => r.returnId !== returnId));
    setDiscardItem(null);
  };

  const handleAddReturn = ({ itemId, quantity, reason, creditNo, returnDate }) => {
    // Find the item details from inventory
    const item = inventoryOptions.find((i) => i.id === itemId);
    const nextNum = rows.length + 1;
    const newRow = {
      returnId: `RET-${String(nextNum).padStart(3, "0")}`,
      refNo: itemId,
      productName: item?.product || itemId,
      quantity: quantity,
      reason: reason,
      creditNo: creditNo,
      returnDate: formatDate(returnDate),
      status: "Pending",
    };
    setRows((prev) => [newRow, ...prev]);
    setAddModalOpen(false);
    setPage(1);
  };

  const columns = [
    { key: "returnId", label: "Return ID" },
    { key: "refNo", label: "Ref No" },
    { key: "productName", label: "Product" },
    { key: "quantity", label: "Qty" },
    { key: "creditNo", label: "Credit Note" },
    { key: "returnDate", label: "Return Date" },
    { key: "status", label: "Status" },
  ];

  return (
    <>
      <DashboardHeader title="Track Returns" onMenuClick={onMenuClick} />

      <main className="returns">
        <div className="returns__toolbar">
          <div className="returns__filters">
            <div className="returns__search">
              <Search size={14} strokeWidth={2.2} />
              <input
                type="text"
                placeholder="Search by Return ID, item, or reason..."
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

          <div className="returns__actions">
            <button className="returns__btn" onClick={handleExport}>
              <Download size={15} strokeWidth={2.2} />
              Export
            </button>
            <button
              className="returns__btn returns__btn--primary"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus size={15} strokeWidth={2.4} />
              Return to Manufacturer
            </button>
          </div>
        </div>

        <section className="card returns__card">
          <div className="returns__scroll">
            <table className="returns__table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key}>
                      <button className="returns__sort" onClick={() => toggleSort(c.key)}>
                        {c.label}
                        <ArrowUpDown size={11} strokeWidth={2.5} />
                      </button>
                    </th>
                  ))}
                  <th className="returns__actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="returns__empty">
                      No return records match your search or filter.
                    </td>
                  </tr>
                )}

                {pageRows.map((row) => (
                  <tr key={row.returnId}>
                    <td className="returns__mono">{row.returnId}</td>
                    <td className="returns__mono">{row.refNo}</td>
                    <td>{row.productName}</td>
                    <td>{row.quantity}</td>
                    <td className="returns__mono">{row.creditNo}</td>
                    <td>{row.returnDate}</td>
                    <td>
                      <span className={`ret-status-pill ret-status-pill--${row.status.toLowerCase()}`}>
                        {row.status.toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <div className="returns__row-actions">
                        <button
                          className="returns__icon-btn"
                          onClick={() => setDetailItem(row)}
                          aria-label={`View ${row.returnId}`}
                          title="View details"
                        >
                          <Eye size={16} strokeWidth={2} />
                        </button>

                        {row.status !== "Completed" && (
                          <button
                            className="returns__icon-btn"
                            onClick={() => setStatusItem(row)}
                            aria-label={`Update status for ${row.returnId}`}
                            title="Update status"
                          >
                            <RefreshCw size={15} strokeWidth={2} />
                          </button>
                        )}

                        {row.status === "Completed" && (
                          <button
                            className="returns__icon-btn returns__icon-btn--danger"
                            onClick={() => setDiscardItem(row)}
                            aria-label={`Discard ${row.returnId}`}
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

      {detailItem && <ReturnDetailsModal item={detailItem} onClose={() => setDetailItem(null)} />}

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
        <AddReturnModal onClose={() => setAddModalOpen(false)} onConfirm={handleAddReturn} />
      )}
    </>
  );
}
