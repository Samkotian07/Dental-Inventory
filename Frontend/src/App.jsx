import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import IssuedItems from "./pages/IssuedItems.jsx";
import TrackExchange from "./pages/TrackExchange.jsx";
import StudentDetails from "./pages/StudentDetails.jsx";
import Stock from "./pages/Stock.jsx";
import FailedInventory from "./pages/FailedInventory.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";

// Components
import StaffManager from "./components/StaffManager.jsx";
import InventoryUpdation from "./components/InventoryUpdation.jsx";
import LowStockSettings from "./components/LowStockSettings.jsx";
import Settings from "./components/Settings.jsx";
import StockInsertion from "./components/StockInsertion.jsx";
import StockDeletion from "./components/StockDeletion.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Main Pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<StudentDetails />} />
        <Route path="/issued" element={<IssuedItems />} />
        <Route path="/track-exchange" element={<TrackExchange />} />

        {/* Stock Pages */}
        <Route path="/stock" element={<Stock />} />
        <Route path="/stock-insertion" element={<StockInsertion />} />
        <Route path="/stock-deletion" element={<StockDeletion />} />
        <Route path="/inventory-updation" element={<InventoryUpdation />} />

        {/* Failed Inventory */}
        <Route path="/failed-inventory" element={<FailedInventory />} />

        {/* Settings & Management */}
        <Route path="/low-stock-settings" element={<LowStockSettings />} />
        <Route path="/staff-manager" element={<StaffManager />} />
        <Route path="/settings" element={<Settings />} />

        {/* Placeholder */}
        <Route path="/coming-soon" element={<ComingSoon />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
