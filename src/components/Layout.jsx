import { useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import "../App.css";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app__main">
        <Outlet context={{ onMenuClick: () => setSidebarOpen(true) }} />
      </div>
    </div>
  );
}

export function useMenuClick() {
  return useOutletContext().onMenuClick;
}
