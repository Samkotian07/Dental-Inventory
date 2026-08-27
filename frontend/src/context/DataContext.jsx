import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const DataContext = createContext();
const API_URL = "http://127.0.0.1:5000/api"; // ⭐ Changed to 127.0.0.1

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("dental_token");
  const headers = { "Content-Type": "application/json" };
  if (token && token !== "null" && token !== "undefined") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export function DataProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("dental_settings");
      return saved
        ? JSON.parse(saved)
        : { lowQuantityThreshold: 10, twoFactor: false, emailUpdates: false };
    } catch {
      return { lowQuantityThreshold: 10, twoFactor: false, emailUpdates: false };
    }
  });

  const updateSettings = (newSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem("dental_settings", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save settings:", e);
      }
      return updated;
    });
  };

  // ========== STUDENT FUNCTIONS ==========

  const fetchStudents = async () => {
    setLoading(true);
    try {
      console.log("📡 Fetching students...");
      const response = await fetch(`${API_URL}/students/`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        console.log("✅ Students loaded:", data.data?.length || 0);
        setStudents(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async (studentData) => {
    try {
      const response = await fetch(`${API_URL}/students/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(studentData)
      });
      const data = await response.json();
      if (data.success) {
        setStudents(prev => [...prev, data.data]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error adding student:", error);
      return { success: false, message: "Network error" };
    }
  };

  const updateStudent = async (id, studentData) => {
    try {
      const response = await fetch(`${API_URL}/students/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(studentData)
      });
      const data = await response.json();
      if (data.success) {
        const updated = data.data;
        setStudents(prev => prev.map(s => (s.id === id || s.campusId === id) ? updated : s));
        return { success: true, data: updated };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error updating student:", error);
      return { success: false, message: "Network error" };
    }
  };

  const deleteStudent = async (id) => {
    try {
      const response = await fetch(`${API_URL}/students/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setStudents(prev => prev.filter(s => s.id !== id && s.campusId !== id));
        return { success: true };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error deleting student:", error);
      return { success: false, message: "Network error" };
    }
  };

  const bulkImportStudents = async (studentsData) => {
    try {
      const response = await fetch(`${API_URL}/students/bulk`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(studentsData)
      });
      const data = await response.json();
      if (data.success) {
        setStudents(prev => [...prev, ...data.data]);
        return { success: true, count: data.data.length };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error bulk importing students:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ========== STAFF FUNCTIONS ==========

  const fetchStaff = async () => {
    try {
      console.log("📡 Fetching staff...");
      const response = await fetch(`${API_URL}/users/`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        console.log("✅ Staff loaded:", data.data?.length || 0);
        setStaff(data.data || []);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error fetching staff:", error);
      return { success: false, message: "Network error" };
    }
  };

  const addStaff = async (staffData) => {
    try {
      const response = await fetch(`${API_URL}/users/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(staffData)
      });
      const data = await response.json();
      if (data.success) {
        setStaff(prev => [...prev, data.data]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error adding staff:", error);
      return { success: false, message: "Network error" };
    }
  };

  const updateStaff = async (id, staffData) => {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(staffData)
      });
      const data = await response.json();
      if (data.success) {
        setStaff(prev => prev.map(s => s.id === id ? data.data : s));
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error updating staff:", error);
      return { success: false, message: "Network error" };
    }
  };

  const toggleStaffStatus = async (id) => {
    try {
      const response = await fetch(`${API_URL}/users/${id}/status`, {
        method: "PUT",
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setStaff(prev => prev.map(s => s.id === id ? data.data : s));
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error toggling staff status:", error);
      return { success: false, message: "Network error" };
    }
  };

  const deleteStaff = async (id) => {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setStaff(prev => prev.filter(s => s.id !== id));
        return { success: true };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error deleting staff:", error);
      return { success: false, message: "Network error" };
    }
  };

  const updateStaffPassword = async (id, password) => {
    try {
      const response = await fetch(`${API_URL}/users/${id}/password`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (data.success) {
        return { success: true };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error updating password:", error);
      return { success: false, message: "Network error" };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await response.json();
      if (data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error?.message || "Failed to change password" };
    } catch (error) {
      console.error("Error changing password:", error);
      return { success: false, message: "Network error" };
    }
  };

  const searchStudents = async (query) => {
    try {
      const response = await fetch(`${API_URL}/students/search?q=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error searching students:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ FIXED: All useEffect hooks are INSIDE the component
  // Initialize - fetch students/staff when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setStudents([]);
      setStaff([]);
      setLoading(false);
      return;
    }
    fetchStudents();
    fetchStaff();
  }, [isAuthenticated]);

  // ⭐ FIXED: Interval is INSIDE the component
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("dental_token");
      if (token && token !== "null" && token !== "undefined" && students.length === 0) {
        console.log("🔄 Token found, reloading students...");
        fetchStudents();
        fetchStaff();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [students.length]);

  const value = {
    students,
    loading,
    fetchStudents,
    searchStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    bulkImportStudents,
    staff,
    fetchStaff,
    addStaff,
    updateStaff,
    toggleStaffStatus,
    deleteStaff,
    updateStaffPassword,
    changePassword,
    settings,
    updateSettings,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}