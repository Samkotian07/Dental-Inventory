import { createContext, useContext, useState, useEffect } from "react";
import {
  students,
  issuedItems,
  exchangeItems,
  inventory,
} from "../data/studentData";

const DataContext = createContext();

export function DataProvider({ children }) {
  // State
  const [inventoryState, setInventoryState] = useState([]);
  const [staff, setStaff] = useState([]);
  const [studentsState, setStudentsState] = useState([]);
  const [issuedItemsState, setIssuedItemsState] = useState([]);
  const [exchangesState, setExchangesState] = useState([]);
  const [settings, setSettings] = useState({ lowQuantityThreshold: 10 });
  const [auditLog, setAuditLog] = useState([]);

  // Initialize with mock data
  useEffect(() => {
    // Format students - USE the imported 'students' directly
    const formattedStudents = students.map((s, index) => ({
      id: s.id || `STU-${String(index + 1).padStart(3, "0")}`,
      name: s.name,
      email:
        s.email || `${s.name.toLowerCase().replace(/\s/g, ".")}@example.com`,
      course: s.course || "Dental",
      year: s.semester || "1st Year",
      status: "active",
      createdAt: s.added || new Date().toISOString().split("T")[0],
    }));

    // Format issued items - USE the imported 'issuedItems'
    const formattedIssued = issuedItems.map((item, index) => ({
      id: item.issueId || `ISS-${String(index + 1).padStart(3, "0")}`,
      studentId:
        item.studentId ||
        `STU-${String(Math.floor(Math.random() * 10) + 1).padStart(3, "0")}`,
      studentName: item.student || "Student Name",
      itemName: item.product || "Dental Item",
      quantity: item.qty || 1,
      issuedDate: item.date || new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      status: item.status === "Active" ? "issued" : "returned",
      refNo: item.refNo || `REF-${String(index + 1).padStart(3, "0")}`,
    }));

    // Format exchanges - USE the imported 'exchangeItems'
    const formattedExchanges = exchangeItems.map((item, index) => ({
      id: item.exchangeId || `EXC-${String(index + 1).padStart(3, "0")}`,
      studentName: item.student || "Student Name",
      itemName: item.reason || "Dental Item",
      requestDate: item.date || new Date().toISOString().split("T")[0],
      status: item.status?.toLowerCase() || "pending",
      quantity: 1,
      reason: item.reason || "Exchange request",
    }));

    // Use the imported inventory data
    const mockInventory =
      inventory.length > 0
        ? inventory
        : [
            {
              id: "INV-001",
              refNo: "INV-001",
              productName: "Dental Floss",
              category: "Consumables",
              companyName: "DentalCo",
              size: "50m",
              lotNo: "LOT-001",
              quantity: 45,
              expiryDate: "2026-12-31",
              lowStockThreshold: 10,
            },
            {
              id: "INV-002",
              refNo: "INV-002",
              productName: "Toothbrush",
              category: "Equipment",
              companyName: "OralCare",
              size: "Medium",
              lotNo: "LOT-002",
              quantity: 8,
              expiryDate: "2027-01-15",
              lowStockThreshold: 15,
            },
            {
              id: "INV-003",
              refNo: "INV-003",
              productName: "Dental Crown",
              category: "Prosthetics",
              companyName: "DentTech",
              size: "Molar",
              lotNo: "LOT-003",
              quantity: 12,
              expiryDate: "2026-10-30",
              lowStockThreshold: 5,
            },
            {
              id: "INV-004",
              refNo: "INV-004",
              productName: "Anesthetic",
              category: "Medications",
              companyName: "PharmaDent",
              size: "2ml",
              lotNo: "LOT-004",
              quantity: 3,
              expiryDate: "2026-09-15",
              lowStockThreshold: 20,
            },
            {
              id: "INV-005",
              refNo: "INV-005",
              productName: "Surgical Gloves",
              category: "Consumables",
              companyName: "SafeHands",
              size: "Large",
              lotNo: "LOT-005",
              quantity: 25,
              expiryDate: "2027-03-20",
              lowStockThreshold: 10,
            },
          ];

    // Mock staff
    const mockStaff = [
      {
        id: 1,
        name: "Admin User",
        email: "admin@yendental.com",
        role: "admin",
        status: "active",
        createdAt: "2024-01-01",
      },
      {
        id: 2,
        name: "John Staff",
        email: "john@yendental.com",
        role: "staff",
        status: "active",
        createdAt: "2024-06-15",
      },
    ];

    setInventoryState(mockInventory);
    setStaff(mockStaff);
    setStudentsState(formattedStudents);
    setIssuedItemsState(formattedIssued);
    setExchangesState(formattedExchanges);
    setAuditLog([
      {
        id: 1,
        action: "CREATE",
        details: "Added new staff member: John Staff",
        timestamp: new Date().toISOString(),
      },
      {
        id: 2,
        action: "UPDATE",
        details: "Updated inventory: Dental Floss",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ]);
  }, []);

  // Data functions
  const updateInventory = (id, updatedData, userName) => {
    setInventoryState((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item)),
    );
    setAuditLog((prev) => [
      {
        id: prev.length + 1,
        action: "UPDATE",
        details: `Updated inventory item by ${userName || "Admin"}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const updateSettings = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateItemThresholds = (updates, userName) => {
    setInventoryState((prev) =>
      prev.map((item) => {
        if (updates[item.id] !== undefined) {
          return { ...item, lowStockThreshold: updates[item.id] };
        }
        return item;
      }),
    );
    setAuditLog((prev) => [
      {
        id: prev.length + 1,
        action: "UPDATE",
        details: `Updated thresholds for ${Object.keys(updates).length} items by ${userName || "Admin"}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const addStaff = (staffData, userName) => {
    const newStaff = {
      id: staff.length + 1,
      ...staffData,
      role: "staff",
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setStaff((prev) => [...prev, newStaff]);
    setAuditLog((prev) => [
      {
        id: prev.length + 1,
        action: "CREATE",
        details: `Added staff member: ${staffData.name} by ${userName || "Admin"}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const updateStaff = (id, staffData, userName) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...staffData } : s)),
    );
    setAuditLog((prev) => [
      {
        id: prev.length + 1,
        action: "UPDATE",
        details: `Updated staff member: ${staffData.name} by ${userName || "Admin"}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const deleteStaff = (id, userName) => {
    const staffToDelete = staff.find((s) => s.id === id);
    setStaff((prev) => prev.filter((s) => s.id !== id));
    setAuditLog((prev) => [
      {
        id: prev.length + 1,
        action: "DELETE",
        details: `Deleted staff member: ${staffToDelete?.name} by ${userName || "Admin"}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const toggleStaffStatus = (id, userName) => {
    setStaff((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "active" ? "inactive" : "active" }
          : s,
      ),
    );
    const staffItem = staff.find((s) => s.id === id);
    setAuditLog((prev) => [
      {
        id: prev.length + 1,
        action: "UPDATE",
        details: `Toggled staff status for ${staffItem?.name} by ${userName || "Admin"}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const value = {
    inventory: inventoryState,
    staff,
    students: studentsState,
    issuedItems: issuedItemsState,
    exchanges: exchangesState,
    settings,
    auditLog,
    updateInventory,
    updateSettings,
    updateItemThresholds,
    addStaff,
    updateStaff,
    deleteStaff,
    toggleStaffStatus,
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
