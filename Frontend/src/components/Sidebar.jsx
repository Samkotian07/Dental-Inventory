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
} from "lucide-react";
import "./Sidebar.css";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Stock", to: "/stock", icon: Boxes },
  { label: "Student Details", to: "/students", icon: Users },
  { label: "Issued", to: "/issued", icon: ClipboardList },
  { label: "Failed Inventory", to: "/failed-inventory", icon: AlertTriangle },
  { label: "Track Exchange", to: "/track-exchange", icon: Repeat },
  { label: "Stock Insertion", to: "/stock-insertion", icon: PackagePlus },
  { label: "Inventory Updation", to: "/inventory-updation", icon: PencilLine },
  { label: "Stock Deletion", to: "/stock-deletion", icon: PackageMinus },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Staff Manager", to: "/staff-manager", icon: UserCog },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <NavLink to="/" className="sidebar__brand" onClick={onClose}>
         {/*** <span className="tooth-mark" aria-hidden="true">
            <svg viewBox="0 0 24 26" fill="none">
              <path
                d="M12 1c-2.1 0-3.3 1.1-4.5 1.1S5.2 1 3.6 1C1.6 1 .5 2.7.5 5.2c0 3 1 6.8 1.9 9.7.7 2.3 1.3 4.6 2.6 8.2.5 1.3 1.1 1.9 1.8 1.9.9 0 1.3-1 1.6-2.7.3-1.9.6-4.6 1.7-4.6.9 0 1.3 1.7 1.7 3.5.4 1.9.8 3.8 1.8 3.8.7 0 1.3-.6 1.8-1.9 1.3-3.6 1.9-5.9 2.6-8.2.9-2.9 1.9-6.7 1.9-9.7C23.5 2.7 22.4 1 20.4 1c-1.6 0-2.7 1.1-3.9 1.1S14.1 1 12 1Z"
                fill="currentColor"
              />
            </svg>
          </span>***/}
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
                  className={({ isActive }) => `sidebar__link ${isActive ? "is-active" : ""}`}
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
