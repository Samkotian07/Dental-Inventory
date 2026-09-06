import { useMemo, useState, useEffect } from "react";
import { Search, Download, Plus, Pencil, Trash2, Eye, ArrowUpDown, Package } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import BulkImportPanel from "../components/student-details/BulkImportPanel.jsx";
import StudentFormModal from "../components/student-details/StudentFormModal.jsx";
import DeleteStudentModal from "../components/student-details/DeleteStudentModal.jsx";
import StudentHistoryModal from "../components/student-details/StudentHistoryModal.jsx";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { useInventory } from "../context/InventoryContext.jsx";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import "./css/StudentDetails.css";

const PAGE_SIZE = 6;

export { toRomanSemester } from "../utils/formatters.js";

const CSV_COLUMNS = [
  { key: "campusId", label: "Campus ID" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "course", label: "Course" },
  { key: "batch", label: "Batch" },
  { key: "pendingReturnCount", label: "Pending Returns" },
];

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function StudentDetails() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const { students, loading, addStudent, updateStudent, deleteStudent, bulkImportStudents } = useData();
  const { issuedItems = [] } = useInventory();

  const [query, setQuery] = useState("");
  const [searchParams] = useSearchParams();
  const [selectedBatch, setSelectedBatch] = useState("All Batches");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formStudent, setFormStudent] = useState(undefined);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [historyStudent, setHistoryStudent] = useState(null);

  useEffect(() => {
    setQuery(searchParams.get("search") || "");
    setPage(1);
  }, [searchParams]);

  const availableBatches = useMemo(() => {
    const set = new Set();
    (students || []).forEach((student) => {
      if (student.batch) {
        set.add(student.batch);
      }
    });
    return ["All Batches", ...Array.from(set).sort()];
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = students.filter((r) => {
      const matchesBatch =
        selectedBatch === "All Batches" ||
        r.batch === selectedBatch;
      const matchesQuery =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q) ||
        r.campusId?.toLowerCase().includes(q) ||
        r.course?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.batch?.toLowerCase().includes(q);
      return matchesBatch && matchesQuery;
    });

    if (sort.key) {
      list = [...list].sort((a, b) => {
        const va = a[sort.key] ?? "";
        const vb = b[sort.key] ?? "";
        return String(va).localeCompare(String(vb)) * sort.dir;
      });
    }

    return list;
  }, [students, query, selectedBatch, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }));
  };

  const handleExport = () => {
    exportToCsv(`students-${new Date().toISOString().slice(0, 10)}`, CSV_COLUMNS, filtered);
    toast.success("Exported successfully!");
  };

  const handleSaveStudent = async (existingId, formData) => {
    if (existingId) {
      const result = await updateStudent(existingId, formData);
      if (result.success) {
        toast.success("Student updated successfully!");
        setFormStudent(undefined);
      } else {
        toast.error(result.message || "Failed to update student");
      }
    } else {
      const result = await addStudent(formData);
      if (result.success) {
        toast.success("Student added successfully!");
        setFormStudent(undefined);
        setPage(1);
      } else {
        toast.error(result.message || "Failed to add student");
      }
    }
  };

  const handleBulkImport = async (importedData) => {
    const result = await bulkImportStudents(importedData);
    if (result.success) {
      toast.success(`Imported ${result.count} students successfully!`);
      setPage(1);
    } else {
      toast.error(result.message || "Failed to import students");
    }
  };

  const handleConfirmDelete = async (studentId) => {
    const result = await deleteStudent(studentId);
    if (result.success) {
      toast.success("Student deleted successfully!");
      setDeleteTarget(null);
    } else {
      toast.error(result.message || "Failed to delete student");
    }
  };

  const columns = [
    { key: "campusId", label: "Campus ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "course", label: "Course" },
    { key: "batch", label: "Batch" },
    { key: "pendingReturns", label: "Pending Returns" },
  ];

  const getPendingCount = (row) => {
    const sId = (row.campusId || row.id || "").toLowerCase();
    const sName = (row.name || "").toLowerCase();
    const activeCount = (issuedItems || []).filter((i) => {
      const matchId = (i.studentId || "").toLowerCase() === sId;
      const matchName = (i.studentName || i.student || "").toLowerCase() === sName;
      const isReturned = i.status?.toLowerCase() === "returned";
      const isCondemned = i.status?.toLowerCase() === "condemned";
      const isExchanged = i.status?.toLowerCase() === "vendor_exchange";
      return (matchId || matchName) && !isReturned && !isCondemned && !isExchanged;
    }).length;
    return Math.max(Number(row.pendingReturnCount || 0), activeCount);
  };

  return (
    <>
      <DashboardHeader title="Student Details" onMenuClick={onMenuClick} />

      <main className="students">
        <div className="students__toolbar">
          <div className="students__filters">
            <div className="students__search">
              <Search size={14} strokeWidth={2.2} />
              <input
                type="text"
                placeholder="Search by name, ID, course, or email..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="students__batch-filter">
              <select
                value={selectedBatch}
                onChange={(e) => {
                  setSelectedBatch(e.target.value);
                  setPage(1);
                }}
              >
                {availableBatches.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="students__actions">
            <button className="students__btn" onClick={handleExport}>
              <Download size={15} strokeWidth={2.2} />
              Export
            </button>
            <button className="students__btn students__btn--primary" onClick={() => setFormStudent(null)}>
              <Plus size={15} strokeWidth={2.4} />
              Add Student
            </button>
          </div>
        </div>

        <BulkImportPanel onImport={handleBulkImport} />

        <section className="card students__card">
          <div className="students__scroll">
            <table className="students__table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key}>
                      <button className="students__sort" onClick={() => toggleSort(c.key)}>
                        {c.label}
                        <ArrowUpDown size={11} strokeWidth={2.5} />
                      </button>
                    </th>
                  ))}
                  <th className="students__actions-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="students__empty">
                      Loading...
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="students__empty">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => {
                    const pendingCount = getPendingCount(row);
                    return (
                      <tr key={row.campusId || row.id}>
                        <td className="students__mono">{row.campusId || row.id}</td>
                        <td className="students__strong">{row.name}</td>
                        <td>{row.email || "—"}</td>
                        <td>
                          <span className="students-tag">{row.course || "—"}</span>
                        </td>
                        <td>
                          <span className="students-batch-tag">{row.batch || "—"}</span>
                        </td>
                        <td>
                          {pendingCount > 0 ? (
                            <span className="students__pending-badge">
                              <Package size={12} />
                              {pendingCount} item{pendingCount > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="students__no-pending">✅ Clear</span>
                          )}
                        </td>
                        <td className="students__actions-cell">
                          <div className="students__row-actions">
                            <button
                              className="students__icon-btn students__icon-btn--view"
                              onClick={() => setHistoryStudent(row)}
                              aria-label={`View history for ${row.name}`}
                              title="View student history"
                            >
                              <Eye size={15} strokeWidth={2} />
                            </button>
                            <button
                              className="students__icon-btn students__icon-btn--edit"
                              onClick={() => setFormStudent(row)}
                              aria-label={`Edit ${row.name}`}
                              title="Edit student"
                            >
                              <Pencil size={15} strokeWidth={2} />
                            </button>
                            <button
                              className="students__icon-btn students__icon-btn--danger"
                              onClick={() => setDeleteTarget(row)}
                              aria-label={`Remove ${row.name}`}
                              title="Remove student"
                            >
                              <Trash2 size={15} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
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

      {formStudent !== undefined && (
        <StudentFormModal
          student={formStudent}
          onClose={() => setFormStudent(undefined)}
          onSave={handleSaveStudent}
        />
      )}

      {deleteTarget && (
        <DeleteStudentModal
          student={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {historyStudent && (
        <StudentHistoryModal
          student={historyStudent}
          onClose={() => setHistoryStudent(null)}
        />
      )}
    </>
  );
}