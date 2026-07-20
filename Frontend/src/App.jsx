import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import IssuedItems from "./pages/IssuedItems.jsx";
import TrackExchange from "./pages/TrackExchange.jsx";
import StudentDetails from "./pages/StudentDetails.jsx"
import ComingSoon from "./pages/ComingSoon.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<StudentDetails />} />
        <Route path="/issued" element={<IssuedItems />} />
        <Route path="/Track-exchange" element={<TrackExchange />} />

        {/* Placeholder routes for features still under development */}
        <Route path="/stock" element={<ComingSoon />} />
        <Route path="/failed-inventory" element={<ComingSoon />} />
        <Route path="/stock-insertion" element={<ComingSoon />} />
        <Route path="/inventory-updation" element={<ComingSoon />} />
        <Route path="/stock-deletion" element={<ComingSoon />} />
        <Route path="/settings" element={<ComingSoon />} />
        <Route path="/staff-manager" element={<ComingSoon />} />
        <Route path="/coming-soon" element={<ComingSoon />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
