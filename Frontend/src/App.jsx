import { useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import Carousel from "./components/Carousel.jsx";
import "./App.css";

export default function App() {
  const [active, setActive] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app">
      <Sidebar
        active={active}
        onNavigate={(label) => {
          setActive(label);
          setSidebarOpen(false);
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app__main">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="app__content">
          <div className="app__intro">
            <h1>Welcome back</h1>
            <p>Jump into issued items, active exchanges, or the full inventory.</p>
          </div>

          <Carousel />
        </main>
      </div>
    </div>
  );
}
