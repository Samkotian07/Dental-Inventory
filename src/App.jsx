import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout.jsx";
import Login from "./components/Login.jsx";
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
    return <Navigate to="/dashboard" replace />;
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
        <Route path="/track-exchange" element={<TrackExchange />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/failed-inventory" element={<FailedInventory />} />

        {/* Admin Only Routes */}
        <Route
          path="/stock-insertion"
          element={
            <AdminRoute>
              <StockInsertion />
            </AdminRoute>
          }
        />
        <Route
          path="/stock-deletion"
          element={
            <AdminRoute>
              <StockDeletion />
            </AdminRoute>
          }
        />
        <Route
          path="/inventory-updation"
          element={
            <AdminRoute>
              <InventoryUpdation />
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
          path="/settings"
          element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          }
        />

        <Route path="/coming-soon" element={<ComingSoon />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
