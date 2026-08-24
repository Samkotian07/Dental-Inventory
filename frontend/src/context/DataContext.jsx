import { createContext, useContext, useState, useEffect } from "react";

const DataContext = createContext();
const API_URL = "http://localhost:5000/api";

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("dental_token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
};

export function DataProvider({ children }) {
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

  // Fetch all students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/students/`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add a new student
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

  // Update a student
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

  // Delete a student
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

  // Bulk import students
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

  // Fetch all staff
  const fetchStaff = async () => {
    try {
      const response = await fetch(`${API_URL}/users/`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setStaff(data.data);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error fetching staff:", error);
      return { success: false, message: "Network error" };
    }
  };

  // Add a new staff member
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

  // Update a staff member
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

  // Toggle staff status
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

  // Delete a staff member
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

  // Update staff password
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

  // Initialize - fetch students on mount
  useEffect(() => {
    fetchStudents();
    fetchStaff();
  }, []);

  const value = {
    // Students
    students,
    loading,
    fetchStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    bulkImportStudents,
    // Staff
    staff,
    fetchStaff,
    addStaff,
    updateStaff,
    toggleStaffStatus,
    deleteStaff,
    updateStaffPassword,
    // Settings
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