import { useMemo, useState } from "react";
import { Search, Download, Plus, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import BulkImportPanel from "../components/student-details/BulkImportPanel.jsx";
import StudentFormModal from "../components/student-details/StudentFormModal.jsx";
import DeleteStudentModal from "../components/student-details/DeleteStudentModal.jsx";
import { studentItems as seedData } from "../data/studentData.js";
import { exportToCsv } from "../utils/csv.js";
import { useMenuClick } from "../components/Layout.jsx";
import "./StudentDetails.css";

const PAGE_SIZE = 6;

const CSV_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "campusId", label: "Campus ID" },
  { key: "course", label: "Course" },
  { key: "semester", label: "Semester" },
  { key: "added", label: "Added" },
];

function formatDisplayDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

// Table shows the compact "Sem 5" form; the edit/add form uses the full "Semester 5" label
function toShortSemester(semester) {
  return semester.replace(/^Semester/, "Sem");
}

export default function StudentDetails() {
  const onMenuClick = useMenuClick();
  const [rows, setRows] = useState(seedData);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);

  const [formStudent, setFormStudent] = useState(undefined); // undefined = closed, null = add, object = edit
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.campusId.toLowerCase().includes(q) ||
        r.course.toLowerCase().includes(q)
      );
    });

    if (sort.key) {
      list = [...list].sort((a, b) => {
        const va = a[sort.key] ?? "";
        const vb = b[sort.key] ?? "";
        return String(va).localeCompare(String(vb)) * sort.dir;
      });
    }

    return list;
  }, [rows, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }));
  };

  const handleExport = () => {
    exportToCsv(`students-${new Date().toISOString().slice(0, 10)}`, CSV_COLUMNS, filtered);
  };

  const handleSaveStudent = (existingCampusId, form) => {
    if (existingCampusId) {
      setRows((prev) =>
        prev.map((s) => (s.campusId === existingCampusId ? { ...s, ...form } : s))
      );
    } else {
      setRows((prev) => [
        { ...form, added: new Date().toISOString().slice(0, 10) },
        ...prev,
      ]);
      setPage(1);
    }
    setFormStudent(undefined);
  };

  const handleImport = (imported) => {
    setRows((prev) => [...imported, ...prev]);
    setPage(1);
  };

  const handleConfirmDelete = (campusId) => {
    setRows((prev) => prev.filter((s) => s.campusId !== campusId));
    setDeleteTarget(null);
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "campusId", label: "Campus ID" },
    { key: "course", label: "Course" },
    { key: "semester", label: "Semester" },
    { key: "added", label: "Added" },
  ];

  return (
    <>
      <DashboardHeader title="Student Details" onMenuClick={onMenuClick} />

      <main className="students">
        <div className="students__toolbar">
          <div className="students__search students__search--wide">
            <Search size={14} strokeWidth={2.2} />
            <input
              type="text"
              placeholder="Search by name, campus ID, course..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
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

        <BulkImportPanel onImport={handleImport} />

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
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="students__empty">
                      No students match your search.
                    </td>
                  </tr>
                )}

                {pageRows.map((row) => (
                  <tr key={row.campusId}>
                    <td className="students__strong">{row.name}</td>
                    <td className="students__mono">{row.campusId}</td>
                    <td>
                      <span className="students-tag">{row.course}</span>
                    </td>
                    <td>{toShortSemester(row.semester)}</td>
                    <td>{formatDisplayDate(row.added)}</td>
                    <td>
                      <div className="students__row-actions">
                        <button
                          className="students__icon-btn"
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
    </>
  );
}
