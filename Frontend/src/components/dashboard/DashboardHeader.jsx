import { Menu, Boxes, ClipboardList, Repeat } from "lucide-react";
import NotificationBell from "../NotificationBell.jsx";
import "./DashboardHeader.css";

const pills = [
  { label: "Inventory", icon: Boxes, tone: "blue" },
  { label: "Issue", icon: ClipboardList, tone: "green" },
  { label: "Exchange", icon: Repeat, tone: "purple" },
];

export default function DashboardHeader({ onMenuClick }) {
  return (
    <header className="page-header dash-header">
      <button className="page-header__menu" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <h1>Dashboard</h1>

      <div className="dash-header__pills">
        {pills.map(({ label, icon: Icon, tone }) => (
          <button key={label} className={`dash-pill dash-pill--${tone}`}>
            <Icon size={15} strokeWidth={2.2} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <NotificationBell />
    </header>
  );
}
