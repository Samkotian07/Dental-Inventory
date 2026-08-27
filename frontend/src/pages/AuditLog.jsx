import { useState, useEffect, useMemo } from "react";
import { Search, ScrollText, Filter, ArrowUpDown } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import { useMenuClick } from "../components/Layout.jsx";
import "./css/AuditLog.css";

const PAGE_SIZE = 10;
const API_URL = "http://localhost:5000/api";

function formatTimestamp(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionBadgeTone(action) {
  switch (action?.toUpperCase()) {
    case "CREATE":
    case "CREATE_RETURN":
      return "audit-badge--green";
    case "UPDATE":
    case "UPDATE_RETURN_STATUS":
      return "audit-badge--blue";
    case "ISSUE":
      return "audit-badge--purple";
    case "RETURN":
    case "RESTORE":
      return "audit-badge--amber";
    case "DISPOSE":
    case "CONDEMN":
    case "DELETE":
      return "audit-badge--red";
    default:
      return "audit-badge--neutral";
  }
}

export default function AuditLog() {
  const onMenuClick = useMenuClick();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [sort, setSort] = useState({ key: "timestamp", dir: -1 });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("dental_token");
        const res = await fetch(`${API_URL}/audit-logs/`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success && data.data) {
          setLogs(data.data);
        }
      } catch (err) {
        console.error("Error fetching audit logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = logs.filter((log) => {
      const matchAction =
        actionFilter === "ALL" ||
        log.action?.toUpperCase() === actionFilter.toUpperCase();
      const matchQuery =
        !q ||
        (log.details || "").toLowerCase().includes(q) ||
        (log.user_name || "").toLowerCase().includes(q) ||
        (log.entity_type || "").toLowerCase().includes(q) ||
        (log.entity_id || "").toLowerCase().includes(q);
      return matchAction && matchQuery;
    });

    if (sort.key) {
      list = [...list].sort((a, b) => {
        const va = a[sort.key] ?? "";
        const vb = b[sort.key] ?? "";
        return String(va).localeCompare(String(vb)) * sort.dir;
      });
    }

    return list;
  }, [logs, query, actionFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredLogs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: -prev.dir } : { key, dir: 1 }
    );
  };

  return (
    <>
      <DashboardHeader title="Audit Logs" onMenuClick={onMenuClick} />

      <main className="audit-log">
        <div className="audit-log__toolbar">
          <div className="audit-log__search">
            <Search size={14} strokeWidth={2.2} />
            <input
              type="text"
              placeholder="Search details, user, entity..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="audit-log__filter">
            <Filter size={14} />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="ISSUE">ISSUE</option>
              <option value="RETURN">RETURN</option>
              <option value="RESTORE">RESTORE</option>
              <option value="DISPOSE">DISPOSE</option>
            </select>
          </div>
        </div>

        <section className="card audit-log__card">
          <div className="audit-log__scroll">
            <table className="audit-log__table">
              <thead>
                <tr>
                  <th>
                    <button
                      className="audit-log__sort"
                      onClick={() => toggleSort("timestamp")}
                    >
                      Timestamp
                      <ArrowUpDown size={11} strokeWidth={2.5} />
                    </button>
                  </th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="audit-log__empty">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="audit-log__empty">
                      No audit log entries found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((log) => (
                    <tr key={log.id}>
                      <td className="audit-log__mono">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td>
                        <span
                          className={`audit-badge ${getActionBadgeTone(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="audit-log__mono">
                        {log.entity_type} (#{log.entity_id})
                      </td>
                      <td className="audit-log__strong">
                        {log.user_name || log.user_id || "System"}
                      </td>
                      <td>{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={filteredLogs.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </section>
      </main>
    </>
  );
}
