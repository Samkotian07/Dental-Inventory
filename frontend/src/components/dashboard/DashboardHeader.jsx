import { Menu, Boxes, ClipboardList, Repeat } from "lucide-react";
import { Link } from "react-router-dom";
import NotificationBell from "../NotificationBell.jsx";
import "./DashboardHeader.css";

const pills = [
  { label: "Inventory", icon: Boxes, tone: "blue", to: "/dashboard" },
  { label: "Issue", icon: ClipboardList, tone: "green", to: "/issued" },
  { label: "Exchange", icon: Repeat, tone: "purple", to: "/Track-exchange" },
];

export default function DashboardHeader({ title = "Dashboard", onMenuClick }) {
  return (
    <header className="page-header dash-header">
      <button className="page-header__menu" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <h1>{title}</h1>

      <div className="dash-header__pills">
        {pills.map(({ label, icon: Icon, tone, to }) => (
          <Link key={label} to={to} className={`dash-pill dash-pill--${tone}`}>
            <Icon size={15} strokeWidth={2.2} />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <NotificationBell />
    </header>
  );
}
