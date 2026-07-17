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
import { issuedItems as seedData, students, inventoryOptions } from "../data/issuedData.js";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import "./IssuedItems.css";

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
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function IssuedItems() {
  const onMenuClick = useMenuClick();

  const [rows, setRows] = useState(seedData);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);

  const [detailItem, setDetailItem] = useState(null);
  const [returnItem, setReturnItem] = useState(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => {
      const matchesStatus = status === "All Status" || r.status === status;
      const matchesQuery =
        !q ||
        r.student.toLowerCase().includes(q) ||
        r.studentId.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.issueId.toLowerCase().includes(q) ||
        r.refNo.toLowerCase().includes(q);
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
    exportToCsv(`issued-items-${new Date().toISOString().slice(0, 10)}`, CSV_COLUMNS, filtered);
  };

  const handleConfirmReturn = (issueId, returnDateISO) => {
    setRows((prev) =>
      prev.map((r) =>
        r.issueId === issueId
          ? { ...r, status: "Returned", returnDate: formatDate(returnDateISO) }
          : r
      )
    );
    setReturnItem(null);
  };

  const handleIssueNew = ({ studentId, itemId, qty }) => {
    const student = students.find((s) => s.id === studentId);
    const item = inventoryOptions.find((i) => i.id === itemId);
    const nextNum = rows.length + 1;
    const newRow = {
      issueId: `ISS-${String(nextNum).padStart(3, "0")}`,
      studentId,
      student: student?.name ?? studentId,
      product: item?.product ?? itemId,
      lotNo: `LOT-2024-${String(nextNum).padStart(3, "0")}`,
      refNo: itemId,
      qty,
      date: formatDate(new Date()),
      returnDate: null,
      status: "Active",
    };
    setRows((prev) => [newRow, ...prev]);
    setIssueModalOpen(false);
    setPage(1);
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
              <option>All Status</option>
              <option>Active</option>
              <option>Returned</option>
            </select>
          </div>

          <div className="issued__actions">
            <button className="issued__btn" onClick={handleExport}>
              <Download size={15} strokeWidth={2.2} />
              Export
            </button>
            <button className="issued__btn issued__btn--primary" onClick={() => setIssueModalOpen(true)}>
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
                      <button className="issued__sort" onClick={() => toggleSort(c.key)}>
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
                  <tr key={row.issueId}>
                    <td className="issued__mono">{row.issueId}</td>
                    <td className="issued__strong">{row.student}</td>
                    <td className="issued__mono">{row.studentId}</td>
                    <td>{row.product}</td>
                    <td className="issued__mono">{row.lotNo}</td>
                    <td className="issued__mono">{row.refNo}</td>
                    <td>{row.qty}</td>
                    <td>{row.date}</td>
                    <td>
                      <span className={`status-pill status-pill--${row.status.toLowerCase()}`}>
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
        <IssueDetailsModal item={detailItem} onClose={() => setDetailItem(null)} />
      )}

      {returnItem && (
        <ReturnItemModal
          item={returnItem}
          onClose={() => setReturnItem(null)}
          onConfirm={handleConfirmReturn}
        />
      )}

      {issueModalOpen && (
        <IssueItemModal onClose={() => setIssueModalOpen(false)} onConfirm={handleIssueNew} />
      )}
    </>
  );
}
