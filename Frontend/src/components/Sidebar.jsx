import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Users,
  ClipboardList,
  AlertTriangle,
  Repeat,
  PackagePlus,
  PencilLine,
  PackageMinus,
  Settings,
  UserCog,
  LogOut,
  HomeIcon,
} from "lucide-react";
import "./Sidebar.css";

const navItems = [
  { label: "Home", to: "/", icon: HomeIcon },
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Stock", to: "/stock", icon: Boxes },
  { label: "Student Details", to: "/students", icon: Users },
  { label: "Issued", to: "/issued", icon: ClipboardList },
  { label: "Failed Inventory", to: "/failed-inventory", icon: AlertTriangle },
  { label: "Track Exchange", to: "/track-exchange", icon: Repeat },
  { label: "Inventory Updation", to: "/inventory-updation", icon: PencilLine },
  { label: "Stock Insertion", to: "/stock-insertion", icon: PackagePlus },
  { label: "Stock Deletion", to: "/stock-deletion", icon: PackageMinus },
  {
    label: "Low Stock Settings",
    to: "/low-stock-settings",
    icon: AlertTriangle,
  },
  { label: "Staff Manager", to: "/staff-manager", icon: UserCog },
  { label: "Settings", to: "/settings", icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />
      )}
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <NavLink to="/" className="sidebar__brand" onClick={onClose}>
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">YEN DENTAL</span>
            <span className="sidebar__brand-sub">Inventory System</span>
          </div>
        </NavLink>

        <nav className="sidebar__nav">
          <ul>
            {navItems.map(({ label, to, icon: Icon }) => (
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

        <button className="sidebar__logout">
          <LogOut size={18} strokeWidth={2} />
          <span>Logout</span>
        </button>

        <div className="sidebar__profile">
          <span className="sidebar__avatar">A</span>
          <div className="sidebar__profile-text">
            <span className="sidebar__profile-name">Admin User</span>
            <span className="sidebar__profile-role">Admin</span>
          </div>
        </div>
      </aside>
    </>
  );
}
