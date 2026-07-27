import { useState, useMemo } from "react";
import { Edit, Trash2, Plus, UserCheck, UserX } from "lucide-react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import SearchBar from "./common/SearchBar";
import Select from "./common/Select";
import Table from "./common/Table";
import Modal from "./issued/Modal.jsx";
import Button from "./common/Button";
import Badge from "./common/Badge";
import ConfirmDialog from "./common/ConfirmDialog";
import DashboardHeader from "./dashboard/DashboardHeader.jsx";
import { useMenuClick } from "./Layout.jsx";
import { validateEmail } from "./utils/validators"; // ← Fixed
import { formatDate, exportToCSV } from "./utils/helpers"; // ← Fixed
import { toast } from "sonner";
import "./StaffManager.css";

export default function StaffManager() {
  const onMenuClick = useMenuClick();
  const { user } = useAuth();
  const { staff, addStaff, updateStaff, deleteStaff, toggleStaffStatus } =
    useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [staff, search, statusFilter]);

  const columns = [
    {
      key: "id",
      label: "ID",
      render: (s) => <span className="staff-id">#{s.id}</span>,
    },
    {
      key: "name",
      label: "Name",
      render: (s) => <span className="staff-name">{s.name}</span>,
    },
    { key: "email", label: "Email" },
    {
      key: "role",
      label: "Role",
      render: (s) => (
        <Badge variant={s.role === "admin" ? "secondary" : "primary"}>
          {s.role}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (s) => (
        <Badge variant={s.status === "active" ? "success" : "neutral"}>
          {s.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (s) => formatDate(s.createdAt),
    },
  ];

  const handleAdd = () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("All fields are required");
      return;
    }
    if (!validateEmail(form.email)) {
      toast.error("Please enter a valid email");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    addStaff(
      { name: form.name, email: form.email, password: form.password },
      user?.name,
    );
    setForm({ name: "", email: "", password: "", confirmPassword: "" });
    setAddOpen(false);
    toast.success("Staff member added successfully");
  };

  const handleEditSave = () => {
    updateStaff(
      editTarget.id,
      { name: editTarget.name, email: editTarget.email },
      user?.name,
    );
    setEditTarget(null);
    toast.success("Staff member updated");
  };

  const handleDelete = () => {
    deleteStaff(deleteTarget.id, user?.name);
    setDeleteTarget(null);
    toast.success("Staff member deleted");
  };

  const handleExport = () => {
    exportToCSV(filtered, "staff.csv", [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status" },
    ]);
    toast.success("CSV exported successfully");
  };

  return (
    <>
      <DashboardHeader title="Staff Management" onMenuClick={onMenuClick} />
      <main className="staff-manager">
      {/* Controls */}
      <div className="staff-controls">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email..."
          className="staff-search"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          className="staff-filter-select"
        />
        <Button
          variant="secondary"
          onClick={handleExport}
          className="staff-export-btn"
        >
          Export
        </Button>
        <Button onClick={() => setAddOpen(true)} className="staff-add-btn">
          <Plus size={16} /> Add Staff
        </Button>
      </div>

      {/* Table */}
      <div className="staff-table-wrapper">
        <Table
          columns={columns}
          data={filtered}
          actions={(item) => (
            <div className="staff-actions">
              <button
                onClick={() => setEditTarget({ ...item })}
                className="staff-action-btn staff-action-edit"
                title="Edit"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => toggleStaffStatus(item.id, user?.name)}
                className={`staff-action-btn ${item.status === "active" ? "staff-action-deactivate" : "staff-action-activate"}`}
                title={item.status === "active" ? "Deactivate" : "Activate"}
              >
                {item.status === "active" ? (
                  <UserX size={16} />
                ) : (
                  <UserCheck size={16} />
                )}
              </button>
              {item.role !== "admin" && (
                <button
                  onClick={() => setDeleteTarget(item)}
                  className="staff-action-btn staff-action-delete"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
        />
      </div>

      {/* Add Modal */}
      {addOpen && (
        <Modal title="Add Staff Member" onClose={() => setAddOpen(false)} width={480}>
          <div className="modal__field">
            <label htmlFor="staff-name">Full Name</label>
            <input id="staff-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
          </div>
          <div className="modal__field">
            <label htmlFor="staff-email">Email Address</label>
            <input id="staff-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@yendental.com" />
          </div>
          <div className="modal__field">
            <label htmlFor="staff-password">Password</label>
            <input id="staff-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
          </div>
          <div className="modal__field">
            <label htmlFor="staff-confirm-password">Confirm Password</label>
            <input id="staff-confirm-password" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
          </div>
          <div className="staff-role-hint"><p>Role: <Badge variant="primary">Staff</Badge> (fixed)</p></div>
          <div className="modal__actions">
            <button className="modal__btn" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="modal__btn modal__btn--primary" onClick={handleAdd}>Add Staff</button>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <Modal title="Edit Staff Member" onClose={() => setEditTarget(null)} width={480}>
          <div className="modal__field">
            <label htmlFor="edit-staff-name">Full Name</label>
            <input id="edit-staff-name" value={editTarget.name} onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })} />
          </div>
          <div className="modal__field">
            <label htmlFor="edit-staff-email">Email Address</label>
            <input id="edit-staff-email" type="email" value={editTarget.email} onChange={(e) => setEditTarget({ ...editTarget, email: e.target.value })} />
          </div>
          <div className="modal__actions">
            <button className="modal__btn" onClick={() => setEditTarget(null)}>Cancel</button>
            <button className="modal__btn modal__btn--primary" onClick={handleEditSave}>Save Changes</button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Staff Member"
        message={`Are you sure you want to delete ${deleteTarget?.name} (${deleteTarget?.email})? This action cannot be undone.`}
        confirmLabel="Delete"
      />
      </main>
    </>
  );
}
