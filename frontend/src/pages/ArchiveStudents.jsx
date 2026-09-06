import { useState, useMemo, useEffect } from "react";
import { Search, Archive, CheckSquare, Square, UserX, AlertCircle, Package } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { useMenuClick } from "../components/Layout.jsx";
import { toast } from "sonner";
import "./css/ArchiveStudents.css";

const PAGE_SIZE = 10;
const API_URL = "http://127.0.0.1:5000/api";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function ArchiveStudents() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const { students, fetchStudents } = useData();
  const [selectedBatch, setSelectedBatch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStudents, setSelectedStudents] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const batches = useMemo(() => {
    const unique = new Set();
    (students || []).forEach(s => {
      if (s.batch) unique.add(s.batch);
    });
    return Array.from(unique).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    let list = students || [];
    
    if (selectedBatch) {
      list = list.filter(s => s.batch === selectedBatch);
    }
    
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => 
        s.name?.toLowerCase().includes(q) ||
        s.campusId?.toLowerCase().includes(q) ||
        s.course?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    
    list = list.filter(s => s.status === 'active');
    
    return list;
  }, [students, selectedBatch, search]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStudents = filteredStudents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents({});
    } else {
      const all = {};
      pageStudents.forEach(s => {
        if (!s.hasPendingReturns) {
          all[s.campusId] = true;
        }
      });
      setSelectedStudents(all);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectStudent = (campusId, hasPendingReturns) => {
    if (hasPendingReturns) return;
    setSelectedStudents(prev => ({
      ...prev,
      [campusId]: !prev[campusId]
    }));
  };

  const isAllSelected = useMemo(() => {
    const pageIds = pageStudents.filter(s => !s.hasPendingReturns).map(s => s.campusId);
    if (pageIds.length === 0) return false;
    return pageIds.every(id => selectedStudents[id]);
  }, [pageStudents, selectedStudents]);

  useEffect(() => {
    setSelectAll(isAllSelected);
  }, [isAllSelected]);

  const handleArchive = async () => {
    const selectedIds = Object.keys(selectedStudents).filter(id => selectedStudents[id]);
    if (selectedIds.length === 0) {
      toast.error("No students selected");
      return;
    }

    const studentNames = selectedIds.map(id => {
      const s = students.find(st => st.campusId === id);
      return s?.name || id;
    });

    if (!window.confirm(`Are you sure you want to archive ${selectedIds.length} student(s)?\n\n${studentNames.join(', ')}`)) {
      return;
    }

    setIsArchiving(true);
    let successCount = 0;
    let failCount = 0;

    for (const campusId of selectedIds) {
      try {
        const token = localStorage.getItem("dental_token");
        const res = await fetch(`${API_URL}/students/${campusId}/archive`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    setIsArchiving(false);
    
    if (successCount > 0) {
      toast.success(`Archived ${successCount} student(s) successfully`);
      setSelectedStudents({});
      setSelectAll(false);
      await fetchStudents();
    }
    
    if (failCount > 0) {
      toast.warning(`${failCount} student(s) could not be archived (pending returns)`);
    }
  };

  const handleArchiveBatch = async () => {
    if (!selectedBatch) {
      toast.error("Please select a batch first");
      return;
    }

    const batchStudents = filteredStudents.filter(s => s.batch === selectedBatch && s.status === 'active');
    const withPending = batchStudents.filter(s => s.hasPendingReturns);
    const withoutPending = batchStudents.filter(s => !s.hasPendingReturns);

    if (withoutPending.length === 0) {
      toast.error(`No students without pending returns in batch "${selectedBatch}"`);
      return;
    }

    const confirmMsg = `Archive all ${withoutPending.length} students in batch "${selectedBatch}"?\n\n${withPending.length} student(s) have pending returns and will NOT be archived.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsArchiving(true);
    try {
      const token = localStorage.getItem("dental_token");
      const res = await fetch(`${API_URL}/students/batch/${encodeURIComponent(selectedBatch)}/archive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message || `Batch "${selectedBatch}" archived successfully`);
        setSelectedStudents({});
        setSelectAll(false);
        await fetchStudents();
      } else {
        toast.error(data.error?.message || "Failed to archive batch");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <>
      <DashboardHeader title="Archive Students" onMenuClick={onMenuClick} />
      
      <main className="archive-students">
        <div className="archive-students__toolbar">
          <div className="archive-students__filters">
            <div className="archive-students__search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(e.target.value);
                setPage(1);
                setSelectedStudents({});
              }}
              className="archive-students__select"
            >
              <option value="">All Batches</option>
              {batches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          
          <div className="archive-students__actions">
            <button
              className="archive-students__btn archive-students__btn--batch"
              onClick={handleArchiveBatch}
              disabled={!selectedBatch || isArchiving}
            >
              <Archive size={16} />
              Archive Batch
            </button>
            <button
              className="archive-students__btn archive-students__btn--primary"
              onClick={handleArchive}
              disabled={Object.keys(selectedStudents).filter(k => selectedStudents[k]).length === 0 || isArchiving}
            >
              <Archive size={16} />
              {isArchiving ? "Archiving..." : `Archive Selected (${Object.keys(selectedStudents).filter(k => selectedStudents[k]).length})`}
            </button>
          </div>
        </div>

        <div className="archive-students__info">
          <AlertCircle size={16} />
          <span>
            Students with <strong>pending returns</strong> (highlighted in red) cannot be archived.
            {selectedBatch && ` Batch: ${selectedBatch}`}
          </span>
        </div>

        <section className="card archive-students__card">
          <div className="archive-students__scroll">
            <table className="archive-students__table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <button
                      className="archive-students__checkbox-btn"
                      onClick={handleSelectAll}
                      disabled={pageStudents.filter(s => !s.hasPendingReturns).length === 0}
                    >
                      {selectAll ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th>Campus ID</th>
                  <th>Name</th>
                  <th>Course</th>
                  <th>Batch</th>
                  <th>Pending Returns</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="archive-students__empty">
                      No active students found.
                      {selectedBatch && ` No students in batch "${selectedBatch}".`}
                    </td>
                  </tr>
                ) : (
                  pageStudents.map((student) => {
                    const isSelected = selectedStudents[student.campusId] || false;
                    const hasPending = student.hasPendingReturns || false;
                    
                    return (
                      <tr key={student.campusId} className={hasPending ? "archive-students__row--pending" : ""}>
                        <td>
                          <button
                            className="archive-students__checkbox-btn"
                            onClick={() => handleSelectStudent(student.campusId, hasPending)}
                            disabled={hasPending}
                          >
                            {isSelected ? (
                              <CheckSquare size={18} />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>
                        <td className="archive-students__mono">{student.campusId}</td>
                        <td className="archive-students__strong">{student.name}</td>
                        <td>{student.course || "—"}</td>
                        <td>
                          <span className="archive-students__batch-tag">{student.batch || "—"}</span>
                        </td>
                        <td>
                          {hasPending ? (
                            <span className="archive-students__pending-badge">
                              <Package size={12} />
                              {student.pendingReturnCount || 0} item{(student.pendingReturnCount || 0) > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="archive-students__no-pending">✅ Clear</span>
                          )}
                        </td>
                        <td>
                          <span className={`archive-students__status-badge ${student.status === 'active' ? 'active' : 'archived'}`}>
                            {student.status || 'active'}
                          </span>
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
            totalItems={filteredStudents.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </section>
      </main>
    </>
  );
}