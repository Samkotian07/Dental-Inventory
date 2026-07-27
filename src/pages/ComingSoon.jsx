import { useLocation } from "react-router-dom";
import { HardHat, Menu } from "lucide-react";
import { useMenuClick } from "../components/Layout.jsx";
import NotificationBell from "../components/NotificationBell.jsx";
import "./ComingSoon.css";

export default function ComingSoon() {
  const onMenuClick = useMenuClick();
  const { pathname } = useLocation();
  const title = pathname
    .slice(1)
    .split("-")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <>
      <header className="page-header">
        <button className="page-header__menu" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <h1>{title}</h1>
        <NotificationBell />
      </header>

      <main className="coming-soon">
        <HardHat size={30} strokeWidth={1.6} />
        <h2>{title} is being built</h2>
        <p>This section isn't wired up yet — check back once it's ready.</p>
      </main>
    </>
  );
}
