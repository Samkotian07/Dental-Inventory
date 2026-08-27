import { useMemo, useState, useEffect } from "react";
import { Search, Download, Plus, Pencil, Trash2, Eye, ArrowUpDown } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import BulkImportPanel from "../components/student-details/BulkImportPanel.jsx";
import StudentFormModal from "../components/student-details/StudentFormModal.jsx";
import DeleteStudentModal from "../components/student-details/DeleteStudentModal.jsx";
import StudentHistoryModal from "../components/student-details/StudentHistoryModal.jsx";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import { toast } from "sonner";
import "./css/StudentDetails.css";

const PAGE_SIZE = 6;

const CSV_COLUMNS = [
  { key: "campusId", label: "Campus ID" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "course", label: "Course" },
  { key: "semester", label: "Semester" },
];

const ROMAN_MAP = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V",
  6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X"
};

export function toRomanSemester(semester) {
  if (!semester) return "—";
  const str = String(semester).trim();

  const romanMatch = str.match(/\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\b/i);
  if (romanMatch) {
    return `Sem ${romanMatch[0].toUpperCase()}`;
  }

  const digitMatch = str.match(/\d+/);
  if (digitMatch) {
    const num = parseInt(digitMatch[0], 10);
    const roman = ROMAN_MAP[num] || digitMatch[0];
    return `Sem ${roman}`;
  }

  return str;
}

export default function StudentDetails() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const { students, loading, addStudent, updateStudent, deleteStudent, bulkImportStudents } = useData();

  const [query, setQuery] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("All Semesters");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formStudent, setFormStudent] = useState(undefined);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [historyStudent, setHistoryStudent] = useState(null);

  const availableSemesters = useMemo(() => {
    const set = new Set();
    (students || []).forEach((student) => {
      if (student.semester) {
        set.add(toRomanSemester(student.semester));
      }
    });

    const ORDER = ["Sem I", "Sem II", "Sem III", "Sem IV", "Sem V", "Sem VI", "Sem VII", "Sem VIII", "Sem IX", "Sem X"];
    const sorted = Array.from(set).sort((a, b) => {
      const idxA = ORDER.indexOf(a);
      const idxB = ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return ["All Semesters", ...sorted];
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = students.filter((r) => {
      const romSem = toRomanSemester(r.semester);
      const matchesSem =
        selectedSemester === "All Semesters" ||
        romSem === selectedSemester ||
        String(r.semester) === selectedSemester;
      const matchesQuery =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q) ||
        r.campusId?.toLowerCase().includes(q) ||
        r.course?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q);
      return matchesSem && matchesQuery;
    });

    if (sort.key) {
      list = [...list].sort((a, b) => {
        const va = a[sort.key] ?? "";
        const vb = b[sort.key] ?? "";
        return String(va).localeCompare(String(vb)) * sort.dir;
      });
    }

    return list;
  }, [students, query, selectedSemester, sort]);

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
    { key: "semester", label: "Semester" },
  ];

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

            <div className="students__sem-filter">
              <select
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  setPage(1);
                }}
              >
                {availableSemesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
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
                  pageRows.map((row) => (
                    <tr key={row.campusId || row.id}>
                      <td className="students__mono">{row.campusId || row.id}</td>
                      <td className="students__strong">{row.name}</td>
                      <td>{row.email || "—"}</td>
                      <td>
                        <span className="students-tag">{row.course || "—"}</span>
                      </td>
                      <td>{toRomanSemester(row.semester)}</td>
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
                  ))
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
