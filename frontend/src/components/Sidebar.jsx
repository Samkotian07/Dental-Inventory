import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Users,
  ClipboardList,
  AlertTriangle,
  Repeat,
  PackagePlus,
  PackageMinus,
  Settings,
  UserCog,
  LogOut,
  HomeIcon,
  AlertCircle,
  ScrollText,
  FileText,
  Archive,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const navItems = [
  { label: "Home", to: "/", icon: HomeIcon },
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Stock", to: "/stock", icon: Boxes },
  { label: "Student Details", to: "/students", icon: Users },
  { label: "Issued", to: "/issued", icon: ClipboardList },
  { label: "Failed Inventory", to: "/failed-inventory", icon: AlertTriangle },
  { label: "Track Returns", to: "/track-exchange", icon: Repeat },
  { label: "Stock Insertion", to: "/stock-insertion", icon: PackagePlus, writeOnly: true },
  { label: "Stock Handle", to: "/stock-handle", icon: PackageMinus, writeOnly: true },
];

const adminOnlyItems = [
  { label: "Stock Settings", to: "/low-stock-settings", icon: AlertCircle },
  { label: "Archive Students", to: "/archive-students", icon: Archive },
  { label: "Staff Manager", to: "/staff-manager", icon: UserCog },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Audit Log", to: "/audit-log", icon: ScrollText },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const isReadonly = user?.role === "readonly";

  const visibleNavItems = navItems.filter(item => isReadonly ? !item.writeOnly : true);

  const handleLogout = () => {
    logout();
    onClose?.();
  };

  return (
    <>
      {open && (
        <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />
      )}
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <NavLink to="/" className="sidebar__brand" onClick={onClose}>
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">CaviTrack</span>
            <span className="sidebar__brand-sub">Inventory System</span>
          </div>
        </NavLink>

        <nav className="sidebar__nav">
          <ul>
            {visibleNavItems.map(({ label, to, icon: Icon }) => (
              <li key={label}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sidebar__link ${isActive ? "is-active" : ""}`
                  }
                >
                  <Icon size={18} strokeWidth={2} />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}

            {/* ⭐ Reports - visible to all users */}
            <li>
              <NavLink
                to="/reports"
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? "is-active" : ""}`
                }
              >
                <FileText size={18} strokeWidth={2} />
                <span>Reports</span>
              </NavLink>
            </li>

            {isAdmin &&
              adminOnlyItems.map(({ label, to, icon: Icon }) => (
                <li key={label}>
                  <NavLink
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `sidebar__link ${isActive ? "is-active" : ""}`
                    }
                  >
                    <Icon size={18} strokeWidth={2} />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
          </ul>
        </nav>

        <div className="sidebar__profile">
          <span className="sidebar__avatar">
            {user?.name?.charAt(0) || "A"}
          </span>
          <div className="sidebar__profile-text">
            <span className="sidebar__profile-name">
              {user?.name || "Guest"}
            </span>
            <span className="sidebar__profile-role">
              {user?.role || "Guest"}
            </span>
          </div>
          <button 
            className="sidebar__logout-btn" 
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </aside>
    </>
  );
}