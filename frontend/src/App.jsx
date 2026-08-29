import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout.jsx";
import Login from "./components/Login.jsx";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import IssuedItems from "./pages/IssuedItems.jsx";
import TrackReturns from "./pages/TrackReturns.jsx";
import StudentDetails from "./pages/StudentDetails.jsx";
import Stock from "./pages/Stock.jsx";
import FailedInventory from "./pages/FailedInventory.jsx";
import AuditLog from "./pages/AuditLog.jsx";

// Components
import StaffManager from "./components/StaffManager.jsx";
import LowStockSettings from "./components/LowStockSettings.jsx";
import Settings from "./components/Settings.jsx";
import StockInsertion from "./components/StockInsertion.jsx";
import StockHandle from "./components/StockHandle.jsx";

import PublicProductHistory from "./pages/PublicProductHistory.jsx";

// ⭐ ADD THIS IMPORT
import UnitHistory from "./pages/UnitHistory.jsx";

// Protected Route Component
function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Admin only wrapper
function AdminRoute({ children }) {
  return <ProtectedRoute requireAdmin>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/product-history/:refNo" element={<PublicProductHistory />} />
      <Route path="/scan/:refNo" element={<PublicProductHistory />} />

      {/* Protected Routes with Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<StudentDetails />} />
        <Route path="/issued" element={<IssuedItems />} />
        <Route path="/track-exchange" element={<TrackReturns />} />
        <Route path="/track-returns" element={<TrackReturns />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/failed-inventory" element={<FailedInventory />} />
        <Route path="/stock-insertion" element={<StockInsertion />} />
        <Route path="/stock-handle" element={<StockHandle />} />
        <Route path="/settings" element={<Settings />} />

        {/* ⭐ ADD UNIT HISTORY ROUTE */}
        <Route path="/unit-history/:unitId" element={<UnitHistory />} />

        {/* Admin Only Routes */}
        <Route
          path="/low-stock"
          element={
            <AdminRoute>
              <LowStockSettings />
            </AdminRoute>
          }
        />
        <Route
          path="/low-stock-settings"
          element={
            <AdminRoute>
              <LowStockSettings />
            </AdminRoute>
          }
        />
        <Route
          path="/staff-manager"
          element={
            <AdminRoute>
              <StaffManager />
            </AdminRoute>
          }
        />
        <Route
          path="/audit-log"
          element={
            <AdminRoute>
              <AuditLog />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}