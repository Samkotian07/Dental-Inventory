import { useMemo, useState } from "react";
import {
  Search,
  Download,
  Plus,
  Eye,
  RotateCcw,
  ArrowUpDown,
} from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import IssueDetailsModal from "../components/issued/IssueDetailsModal.jsx";
import ReturnItemModal from "../components/issued/ReturnItemModal.jsx";
import IssueItemModal from "../components/issued/IssueItemModal.jsx";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import { useData } from "../context/DataContext.jsx";
import { toast } from "sonner";  // ⭐ ADD THIS
import "./css/IssuedItems.css";

const PAGE_SIZE = 6;

const CSV_COLUMNS = [
  { key: "issueId", label: "Issue ID" },
  { key: "studentId", label: "Student ID" },
  { key: "student", label: "Student" },
  { key: "product", label: "Product" },
  { key: "lotNo", label: "Lot No" },
  { key: "refNo", label: "Ref No" },
  { key: "qty", label: "Qty" },
  { key: "date", label: "Issue Date" },
  { key: "returnDate", label: "Return Date" },
  { key: "status", label: "Status" },
];

function formatDate(isoOrDate) {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function IssuedItems() {
  const onMenuClick = useMenuClick();
  const { issuedItems, issueItem, returnIssuedItem, condemnIssuedItem, addReturn, stock, getInventoryId } = useInventory();
  const { students } = useData();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Active");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);

  const [detailItem, setDetailItem] = useState(null);
  const [returnItem, setReturnItem] = useState(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);

  const inventoryOptions = useMemo(
    () =>
      (stock || []).map((s) => ({
        id: s.refNo || s.id,
        product: s.product || s.productName,
        lotNo: s.lotNo,
        qty: s.qty,
      })),
    [stock]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = (issuedItems || []).filter((r) => {
      const matchesStatus = status === "All Status" || r.status === status;
      const matchesQuery =
        !q ||
        (r.student || "").toLowerCase().includes(q) ||
        (r.studentId || "").toLowerCase().includes(q) ||
        (r.product || r.productName || "").toLowerCase().includes(q) ||
        (r.issueId || "").toLowerCase().includes(q) ||
        (r.refNo || "").toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });

    if (sort.key) {
      list = [...list].sort((a, b) => {
        const va = a[sort.key] ?? "";
        const vb = b[sort.key] ?? "";
        if (typeof va === "number" && typeof vb === "number")
          return (va - vb) * sort.dir;
        return String(va).localeCompare(String(vb)) * sort.dir;
      });
    }

    return list;
  }, [issuedItems, query, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }
    );
  };

  const handleExport = () => {
    exportToCsv(
      `issued-items-${new Date().toISOString().slice(0, 10)}`,
      CSV_COLUMNS,
      filtered
    );
  };

  const handleConfirmReturn = async (issueId, returnDateISO, condition = "Good") => {
    const result = await returnIssuedItem(issueId, returnDateISO, condition);
    if (result.success) {
      toast.success("Item returned to inventory successfully");
    } else {
      toast.error(result.message || "Failed to return item");
    }
  };

  const handleCondemn = async (issueId, returnDate, reason) => {
    console.log("🗑️ Condemning item:", issueId, "Reason:", reason);
    const result = await condemnIssuedItem(issueId);
    if (result.success) {
      toast.success(`Item condemned: ${reason || "Discarded"}`);
    } else {
      toast.error(result.message || "Failed to condemn item");
    }
  };

  const handleExchange = async (issueId, returnDate, reason) => {
    const item = (issuedItems || []).find((i) => (i.issueId || i.id) === issueId);
    console.log("🔄 Processing Exchange for issue:", issueId, "Reason:", reason);
    const condemnRes = await condemnIssuedItem(issueId);
    const refNoVal = item?.refNo || "";
    const returnRes = await addReturn({
      type: "exchange",
      refNo: refNoVal,
      inventoryId: refNoVal,
      quantity: item?.qty ?? item?.quantity ?? 1,
      reason: reason ? `Failed: ${reason}` : "Failed item returned by student - Send for exchange",
      returnDate: returnDate || new Date().toISOString().slice(0, 10),
    });

    if (condemnRes.success || returnRes.success) {
      toast.success("Item marked as failed & exchange request added to Track Returns");
    } else {
      toast.error("Failed to process exchange request");
    }
  };

  const handleIssueNew = async ({ studentId, itemId, lotId, lotNo, stockType, qty }) => {
    const student = students.find((s) => s.id === studentId);
    const stockMatch = stock.find((s) => s.refNo === itemId || s.id === itemId);
    const invId = stockMatch?.id || getInventoryId(itemId);

    const result = await issueItem({
      studentId,
      inventoryId: invId,
      refNo: stockMatch?.refNo || itemId,
      lotNo,
      stockType,
      qty: Number(qty),
      issueDate: new Date().toISOString().slice(0, 10),
    });

    if (result.success) {
      const sourceLabel = stockType === "returned" ? " (from Returned Stock)" : "";
      toast.success(`Issued ${qty} item(s) to ${student?.name || studentId}${sourceLabel}`);
      setIssueModalOpen(false);
      setPage(1);
    } else {
      toast.error(result.message || "Failed to issue item");
    }
  };

  const columns = [
    { key: "issueId", label: "Issue ID" },
    { key: "student", label: "Student" },
    { key: "studentId", label: "Student ID" },
    { key: "product", label: "Product" },
    { key: "lotNo", label: "Lot No" },
    { key: "refNo", label: "Ref No" },
    { key: "qty", label: "Qty" },
    { key: "date", label: "Date" },
    { key: "status", label: "Status" },
  ];

  return (
    <>
      <DashboardHeader title="Issued Items" onMenuClick={onMenuClick} />

      <main className="issued">
        <div className="issued__toolbar">
          <div className="issued__filters">
            <div className="issued__search">
              <Search size={14} strokeWidth={2.2} />
              <input
                type="text"
                placeholder="Search by student, product, or ID..."
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
              <option>Active</option>
              <option>Returned</option>
              <option>Condemned</option>
              <option>All Status</option>
            </select>
          </div>

          <div className="issued__actions">
            <button className="issued__btn" onClick={handleExport}>
              <Download size={15} strokeWidth={2.2} />
              Export
            </button>
            <button
              className="issued__btn issued__btn--primary"
              onClick={() => setIssueModalOpen(true)}
            >
              <Plus size={15} strokeWidth={2.4} />
              Issue Item
            </button>
          </div>
        </div>

        <section className="card issued__card">
          <div className="issued__scroll">
            <table className="issued__table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key}>
                      <button
                        className="issued__sort"
                        onClick={() => toggleSort(c.key)}
                      >
                        {c.label}
                        <ArrowUpDown size={11} strokeWidth={2.5} />
                      </button>
                    </th>
                  ))}
                  <th className="issued__actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="issued__empty">
                      No issued items match your search or filter.
                    </td>
                  </tr>
                )}

                {pageRows.map((row) => (
                  <tr key={row.issueId || row.id}>
                    <td className="issued__mono">{row.issueId || row.id}</td>
                    <td className="issued__strong">{row.student || row.studentName}</td>
                    <td className="issued__mono">{row.studentId}</td>
                    <td>{row.product || row.productName}</td>
                    <td className="issued__mono">{row.lotNo}</td>
                    <td className="issued__mono">{row.refNo}</td>
                    <td>{row.qty ?? row.quantity}</td>
                    <td>{row.date || row.issuedDate || row.issueDate}</td>
                    <td>
                      <span
                        className={`status-pill status-pill--${row.status.toLowerCase()}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <div className="issued__row-actions">
                        <button
                          className="issued__icon-btn"
                          onClick={() => setDetailItem(row)}
                          aria-label={`View ${row.issueId}`}
                          title="View details"
                        >
                          <Eye size={16} strokeWidth={2} />
                        </button>
                        {row.status === "Active" && (
                          <button
                            className="issued__icon-btn"
                            onClick={() => setReturnItem(row)}
                            aria-label={`Return ${row.issueId}`}
                            title="Return item"
                          >
                            <RotateCcw size={15} strokeWidth={2} />
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

      {detailItem && (
        <IssueDetailsModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}

      {returnItem && (
        <ReturnItemModal
          item={returnItem}
          onClose={() => setReturnItem(null)}
          onConfirm={handleConfirmReturn}
          onCondemn={handleCondemn}
          onExchange={handleExchange}
        />
      )}

      {issueModalOpen && (
        <IssueItemModal
          onClose={() => setIssueModalOpen(false)}
          onConfirm={handleIssueNew}
        />
      )}
    </>
  );
}
