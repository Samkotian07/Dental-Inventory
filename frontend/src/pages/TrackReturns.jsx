import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Download, Plus, Eye, RefreshCw, Trash2, ArrowUpDown } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import ReturnDetailsModal from "../components/track-exchange/ReturnDetailsModal.jsx";
import UpdateStatusModal from "../components/track-exchange/UpdateStatusModal.jsx";
import CreditNoteModal from "../components/track-exchange/CreditNoteModal.jsx";
import DiscardConfirmModal from "../components/track-exchange/DiscardConfirmModal.jsx";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "sonner";
import "./css/TrackReturns.css";

const PAGE_SIZE = 6;

const CSV_COLUMNS = [
  { key: "returnId", label: "Return ID" },
  { key: "type", label: "Type" },
  { key: "refNo", label: "Ref No" },
  { key: "productName", label: "Product" },
  { key: "quantity", label: "Quantity" },
  { key: "reason", label: "Reason" },
  { key: "creditNoteOrRepl", label: "Credit Note / Repl" },
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
  const { user } = useAuth();
  const { returns = [], updateReturnStatus, discardReturn, sendOverstockToVendor } = useInventory();

  const [query, setQuery] = useState("");
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("All Status");
  const [type, setType] = useState("All Types");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailItem, setDetailItem] = useState(null);
  const [statusItem, setStatusItem] = useState(null);
  const [discardItem, setDiscardItem] = useState(null);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  useEffect(() => {
    setQuery(searchParams.get("search") || "");
    setPage(1);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = (returns || []).filter((r) => {
      const matchesStatus = status === "All Status" || r.status === status;
      const matchesType = type === "All Types" || r.type === type;
      const matchesQuery =
        !q ||
        (r.returnId || "").toLowerCase().includes(q) ||
        (r.refNo || "").toLowerCase().includes(q) ||
        (r.productName || "").toLowerCase().includes(q) ||
        (r.reason || "").toLowerCase().includes(q);
      return matchesStatus && matchesType && matchesQuery;
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
  }, [returns, query, status, type, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }));
  };

  const handleExport = () => {
    exportToCsv(`track-returns-${new Date().toISOString().slice(0, 10)}`, CSV_COLUMNS, filtered);
  };

  const handleUpdateStatus = async (returnId, newStatus, extraData = {}) => {
    const result = await updateReturnStatus(returnId, newStatus, extraData);
    if (result.success) {
      toast.success(`Return status updated to ${newStatus}`);
    } else {
      toast.error(result.message || "Failed to update return status");
    }
    setStatusItem(null);
  };

  const handleDiscardClick = (row) => {
    if (user?.role === "readonly") {
      toast.error("Readonly users cannot discard return records");
      return;
    }
    if (user?.role === "admin") {
      // Admin sees confirm modal for hard delete
      setDiscardItem(row);
    } else {
      // Staff sets to Cancelled
      handleStaffCancel(row);
    }
  };

  const handleStaffCancel = async (row) => {
    const returnId = row.returnId;
    if (!window.confirm(`Are you sure you want to cancel return record ${returnId}?`)) {
      return;
    }
    const result = await discardReturn(returnId);
    if (result.success) {
      toast.success("Return record cancelled");
    } else {
      toast.error(result.message || "Failed to cancel return record");
    }
  };

  const handleAdminDiscard = async (returnId) => {
    const result = await discardReturn(returnId);
    if (result.success) {
      toast.success("Return record discarded");
    } else {
      toast.error(result.message || "Failed to discard return record");
    }
    setDiscardItem(null);
  };

  const columns = [
    { key: "returnId", label: "Return ID" },
    { key: "type", label: "Type" },
    { key: "refNo", label: "Ref No" },
    { key: "productName", label: "Product" },
    { key: "quantity", label: "Qty" },
    { key: "batchNo", label: "Batch No" },
    { key: "creditNoteOrRepl", label: "Credit Note / Repl" },
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
              <option>In Progress</option>
              <option>Completed</option>
              <option>Rejected</option>
              <option>Cancelled</option>
            </select>

            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option>All Types</option>
              <option value="exchange">Exchange</option>
              <option value="creditNote">Credit Note</option>
            </select>
          </div>

          <div className="returns__actions">
            <button className="returns__btn" onClick={handleExport}>
              <Download size={15} strokeWidth={2.2} />
              Export
            </button>
            <button
              className="returns__btn returns__btn--primary"
              onClick={() => setCreditModalOpen(true)}
            >
              <Plus size={15} strokeWidth={2.4} />
              Create Credit Note Return
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

                {pageRows.map((row) => {
                  const isDone =
                    row.status === "Completed" ||
                    row.status === "Rejected" ||
                    row.status === "Cancelled" ||
                    row.status?.toLowerCase() === "completed" ||
                    row.status?.toLowerCase() === "rejected" ||
                    row.status?.toLowerCase() === "cancelled";

                  return (
                    <tr key={row.returnId}>
                      <td className="returns__mono">{row.returnId}</td>
                      <td>
                        <span className={`ret-type-badge ret-type-badge--${row.type}`}>
                          {row.type === "exchange" ? "🔄 Exchange" : "📄 Credit Note"}
                        </span>
                      </td>
                      <td className="returns__mono">{row.refNo}</td>
                      <td>{row.productName}</td>
                      <td>{row.quantity}</td>
                      <td className="returns__mono">{row.batchNo || row.oldBatchNo || "—"}</td>
                      <td className="returns__mono">
                        {row.newBatchNo || row.new_batch_no ? (
                          `🔄 New LOT: ${row.newBatchNo || row.new_batch_no}`
                        ) : row.creditNote || row.creditNoteNo || row.credit_note ? (
                          `📄 ${row.creditNote || row.creditNoteNo || row.credit_note}`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{row.returnDate}</td>
                      <td>
                        <span className={`ret-status-pill ret-status-pill--${(row.status || "Pending").toLowerCase().replace(/\s+/g, "-")}`}>
                          {(row.status || "Pending").toLowerCase()}
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

                          {!isDone && (
                            <button
                              className="returns__icon-btn"
                              onClick={() => setStatusItem(row)}
                              aria-label={`Update status for ${row.returnId}`}
                              title="Update status"
                            >
                              <RefreshCw size={15} strokeWidth={2} />
                            </button>
                          )}

                          <button
                            className="returns__icon-btn returns__icon-btn--danger"
                            onClick={() => handleDiscardClick(row)}
                            aria-label={`Discard ${row.returnId}`}
                            title={user?.role === "admin" ? "Discard record" : "Cancel record"}
                          >
                            <Trash2 size={15} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
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
          onConfirm={handleAdminDiscard}
        />
      )}

      {creditModalOpen && (
        <CreditNoteModal
          onClose={() => setCreditModalOpen(false)}
          onConfirm={sendOverstockToVendor}
        />
      )}
    </>
  );
}