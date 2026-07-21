import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import IssuedItems from "./pages/IssuedItems.jsx";
import TrackExchange from "./pages/TrackExchange.jsx";
import StudentDetails from "./pages/StudentDetails.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import StaffManager from "./components/StaffManager.jsx";
import InventoryUpdation from "./components/InventoryUpdation.jsx";
import LowStockSettings from "./components/LowStockSettings.jsx"; // Note: you have this in components
import Stock from "./pages/Stock.jsx";
import FailedInventory from "./pages/FailedInventory.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<StudentDetails />} />
        <Route path="/issued" element={<IssuedItems />} />
        <Route path="/track-exchange" element={<TrackExchange />} />

        {/* Inventory Management Routes */}
        <Route path="/stock" element={<Stock />} />
        <Route path="/inventory-updation" element={<InventoryUpdation />} />
        <Route path="/low-stock-settings" element={<LowStockSettings />} />

        {/* Stock Management */}
        <Route path="/stock-insertion" element={<ComingSoon />} />
        <Route path="/stock-deletion" element={<ComingSoon />} />
        <Route path="/failed-inventory" element={<FailedInventory />} />

        {/* Staff & Settings */}
        <Route path="/staff-manager" element={<StaffManager />} />
        <Route path="/settings" element={<ComingSoon />} />
        <Route path="/coming-soon" element={<ComingSoon />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
