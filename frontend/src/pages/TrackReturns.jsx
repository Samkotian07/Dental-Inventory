import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Download, Plus, Eye, RefreshCw, Trash2, ArrowUpDown } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import ReturnDetailsModal from "../components/track-exchange/ReturnDetailsModal.jsx";
import UpdateStatusModal from "../components/track-exchange/UpdateStatusModal.jsx";
import ExchangeModal from "../components/track-exchange/ExchangeModal.jsx";
import CreditNoteModal from "../components/track-exchange/CreditNoteModal.jsx";
import DiscardConfirmModal from "../components/track-exchange/DiscardConfirmModal.jsx";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
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
  { key: "creditNote", label: "Credit Note" },
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
  const { returns, addReturn, updateReturnStatus, discardReturn, stock = [] } = useInventory();

  const inventoryOptions = useMemo(
    () =>
      stock.map((s) => ({
        id: s.refNo || s.id,
        product: s.product || s.productName,
      })),
    [stock]
  );

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
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setQuery(searchParams.get("search") || "");
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCreateMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = (returns || []).filter((r) => {
      const matchesStatus = status === "All Status" || r.status === status;
      const matchesType = type === "All Types" || r.type === type;
      const matchesQuery =
        !q ||
        (r.returnId || "").toLowerCase().includes(q) ||
        (r.refNo || "").toLowerCase().includes(q) ||
        (r.product || "").toLowerCase().includes(q) ||
        (r.company || "").toLowerCase().includes(q);
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

  const handleDiscard = async (returnId) => {
    const result = await discardReturn(returnId);
    if (result.success) {
      toast.success("Return record discarded");
    } else {
      toast.error(result.message || "Failed to discard return record");
    }
    setDiscardItem(null);
  };

  const handleAddExchange = async (data) => {
    const item = stock.find((s) => s.refNo === data.itemId || s.id === data.itemId);
    const result = await addReturn({
      type: "exchange",
      refNo: data.itemId,
      productName: item ? (item.product || item.productName) : data.itemId,
      batchNo: data.batchNo || item?.lotNo,
      quantity: data.quantity,
      reason: data.reason,
      returnDate: data.returnDate ? new Date(data.returnDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
    if (result.success) {
      toast.success("Exchange return created successfully");
      setExchangeModalOpen(false);
      setPage(1);
    } else {
      toast.error(result.message || "Failed to create exchange return");
    }
  };

  const handleAddCreditNote = async (data) => {
    const item = stock.find((s) => s.refNo === data.itemId || s.id === data.itemId);
    const result = await addReturn({
      type: "creditNote",
      refNo: data.itemId,
      productName: item ? (item.product || item.productName) : data.itemId,
      batchNo: data.batchNo || item?.lotNo,
      quantity: data.quantity,
      reason: data.reason,
      returnDate: data.returnDate ? new Date(data.returnDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
    if (result.success) {
      toast.success("Credit note return created successfully");
      setCreditModalOpen(false);
      setPage(1);
    } else {
      toast.error(result.message || "Failed to create credit note return");
    }
  };

  const columns = [
    { key: "returnId", label: "Return ID" },
    { key: "type", label: "Type" },
    { key: "refNo", label: "Ref No" },
    { key: "productName", label: "Product" },
    { key: "quantity", label: "Qty" },
    { key: "batchNo", label: "Batch No" },
    { key: "creditNote", label: "Credit Note / Repl" },
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
              <option value="return">Return</option>
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
              Create Return
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
                    <td>
                      <span className={`ret-type-badge ret-type-badge--${row.type}`}>
                        {row.type === "exchange" ? "🔄 Exchange" : "📄 Return"}
                      </span>
                    </td>
                    <td className="returns__mono">{row.refNo}</td>
                    <td>{row.productName}</td>
                    <td>{row.quantity}</td>
                    <td className="returns__mono">{row.batchNo || row.oldBatchNo || "—"}</td>
                    <td className="returns__mono">
                      {row.type === "exchange"
                        ? row.newBatchNo
                          ? `LOT: ${row.newBatchNo}`
                          : "—"
                        : (row.status?.toLowerCase() === "completed" ? (row.creditNote || "—") : "—")}
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

                        {row.status !== "Completed" && row.status !== "Rejected" && (
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
                          onClick={() => setDiscardItem(row)}
                          aria-label={`Discard ${row.returnId}`}
                          title="Discard record"
                        >
                          <Trash2 size={15} strokeWidth={2} />
                        </button>
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
          onConfirm={handleDiscard}
        />
      )}

      {exchangeModalOpen && (
        <ExchangeModal onClose={() => setExchangeModalOpen(false)} onConfirm={handleAddExchange} />
      )}

      {creditModalOpen && (
        <CreditNoteModal onClose={() => setCreditModalOpen(false)} onConfirm={handleAddCreditNote} />
      )}
    </>
  );
}
