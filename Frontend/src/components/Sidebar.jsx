import {
  LayoutDashboard,
  Boxes,
  Users,
  ClipboardList,
  PackagePlus,
  PackageMinus,
  Repeat,
  Settings,
  UserCog,
  LogOut,
} from "lucide-react";
import "./Sidebar.css";

const mainNav = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Stock", icon: Boxes },
  { label: "Student Details", icon: Users },
  { label: "Issued", icon: ClipboardList },
];

const inventoryNav = [
  { label: "Stock Insertion", icon: PackagePlus },
  { label: "Stock Deletion", icon: PackageMinus },
  { label: "Track Exchange", icon: Repeat },
  { label: "Settings", icon: Settings },
  { label: "Staff Manager", icon: UserCog },
];

export default function Sidebar({ active, onNavigate, open, onClose }) {
  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
         {/***<span className="tooth-mark" aria-hidden="true">
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
        </div>

        <nav className="sidebar__nav">
          <ul>
            {mainNav.map(({ label, icon: Icon }) => (
              <li key={label}>
                <button
                  className={`sidebar__link ${active === label ? "is-active" : ""}`}
                  onClick={() => onNavigate(label)}
                >
                  <Icon size={18} strokeWidth={2} />
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="sidebar__section-title">Inventory Updation</p>

          <ul>
            {inventoryNav.map(({ label, icon: Icon }) => (
              <li key={label}>
                <button
                  className={`sidebar__link ${active === label ? "is-active" : ""}`}
                  onClick={() => onNavigate(label)}
                >
                  <Icon size={18} strokeWidth={2} />
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <button className="sidebar__logout">
          <LogOut size={18} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </aside>
    </>
  );
}
