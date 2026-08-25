import { useState, useEffect } from "react";
import { Search, Filter, ArrowUpDown, Eye, User, Calendar, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import { useMenuClick } from "../components/Layout.jsx";
import { toast } from "sonner";
import "./AuditLogs.css";

const PAGE_SIZE = 10;
const API_URL = "http://localhost:5000/api";

export default function AuditLogs() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("dental_token");
      const response = await fetch(`${API_URL}/audit-logs/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setLogs(data.data);
      } else {
        toast.error(data.error?.message || "Failed to fetch audit logs");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(log => {
    const matchSearch = !search || 
      log.details?.toLowerCase().includes(search.toLowerCase()) ||
      log.entityId?.toLowerCase().includes(search.toLowerCase()) ||
      log.userName?.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || log.action === filterAction;
    return matchSearch && matchAction;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const getActionBadge = (action) => {
    const colors = {
      CREATE: "badge-success",
      UPDATE: "badge-primary",
      DELETE: "badge-danger",
      ISSUE: "badge-warning",
      RETURN: "badge-info",
      RESTORE: "badge-success",
      DISPOSE: "badge-danger",
      SENT_TO_VENDOR: "badge-warning",
      MOVE_TO_FAILED: "badge-danger",
      CONDEMN: "badge-danger",
      UPDATE_RETURN_STATUS: "badge-primary",
      CREATE_RETURN: "badge-info"
    };
    return colors[action] || "badge-secondary";
  };

  return (
    <>
      <DashboardHeader title="Audit Logs" onMenuClick={onMenuClick} />
      
      <main className="audit-logs">
        <div className="audit-logs__toolbar">
          <div className="audit-logs__search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="audit-logs__filter"
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          >
            <option value="all">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="ISSUE">ISSUE</option>
            <option value="RETURN">RETURN</option>
            <option value="CONDEMN">CONDEMN</option>
            <option value="RESTORE">RESTORE</option>
            <option value="DISPOSE">DISPOSE</option>
            <option value="SENT_TO_VENDOR">SENT_TO_VENDOR</option>
          </select>
        </div>

        <section className="card audit-logs__card">
          <div className="audit-logs__scroll">
            <table className="audit-logs__table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Entity</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="audit-logs__empty">Loading...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan="6" className="audit-logs__empty">No logs found</td></tr>
                ) : (
                  paginated.map((log) => (
                    <tr key={log.id}>
                      <td className="audit-logs__time">
                        <Clock size={14} />
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <div className="audit-logs__user">
                          <User size={14} />
                          {log.userName || "System"}
                        </div>
                      </td>
                      <td>
                        <span className="audit-logs__entity">
                          {log.entityType}
                        </span>
                        <span className="audit-logs__entity-id">{log.entityId}</span>
                      </td>
                      <td className="audit-logs__details">{log.details}</td>
                      <td>
                        <button
                          className="audit-logs__view-btn"
                          onClick={() => setSelectedLog(log)}
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </section>
      </main>

      {selectedLog && (
        <div className="audit-logs__modal" onClick={() => setSelectedLog(null)}>
          <div className="audit-logs__modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Log Details</h3>
            <div className="audit-logs__modal-body">
              <p><strong>ID:</strong> {selectedLog.id}</p>
              <p><strong>Action:</strong> {selectedLog.action}</p>
              <p><strong>User:</strong> {selectedLog.userName || "System"}</p>
              <p><strong>Entity:</strong> {selectedLog.entityType} ({selectedLog.entityId})</p>
              <p><strong>Details:</strong> {selectedLog.details}</p>
              <p><strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString()}</p>
            </div>
            <button className="audit-logs__modal-close" onClick={() => setSelectedLog(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}