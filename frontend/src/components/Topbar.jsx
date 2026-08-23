import { Search, Menu } from "lucide-react";
import NotificationBell from "./NotificationBell.jsx";
import "./Topbar.css";

export default function Topbar({ onMenuClick }) {
  return (
    <header className="topbar">
      <button className="topbar__menu" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="topbar__search">
        <Search size={16} strokeWidth={2.2} />
        <input type="text" placeholder="Search stock, students, or exchanges" />
      </div>

      <NotificationBell />
    </header>
  );
}
