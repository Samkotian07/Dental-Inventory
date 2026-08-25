import { createContext, useContext, useState, useEffect, useCallback } from "react";

const InventoryContext = createContext(null);
const API_URL = "http://127.0.0.1:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("dental_token");
  const headers = { "Content-Type": "application/json" };
  if (token && token !== "null" && token !== "undefined") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

function normalizeStock(item) {
  return {
    id: item.id || item.ref_no || item.refNo,
    refNo: item.ref_no || item.refNo || item.id,
    product: item.product_name || item.product || item.productName || "Product",
    productName: item.product_name || item.product || item.productName || "Product",
    company: item.company_name || item.company || item.companyName || "Vendor",
    companyName: item.company_name || item.company || item.companyName || "Vendor",
    category: item.category || "General",
    size: item.size || "Standard",
    lotNo: item.lot_no || item.lotNo || "LOT-001",
    quantity: Number(item.quantity ?? item.qty ?? 0),
    qty: Number(item.quantity ?? item.qty ?? 0),
    expiry: item.expiry_date || item.expiry || item.expiryDate || "",
    expiryDate: item.expiry_date || item.expiry || item.expiryDate || "",
    status: item.status || "active",
    lowStockThreshold: item.low_stock_threshold || item.lowStockThreshold || 5,
  };
}

function normalizeIssued(item) {
  const s = String(item.status || "").toLowerCase();
  return {
    id: item.id || item.issue_id || item.issueId,
    issueId: item.id || item.issue_id || item.issueId,
    student: item.student_name || item.student || item.studentName || "Student",
    studentName: item.student_name || item.student || item.studentName || "Student",
    studentId: item.student_id || item.studentId || "",
    product: item.product_name || item.product || item.productName || "Product",
    productName: item.product_name || item.product || item.productName || "Product",
    lotNo: item.lot_no || item.lotNo || "LOT-001",
    refNo: item.ref_no || item.refNo || "",
    quantity: Number(item.quantity ?? item.qty ?? 1),
    qty: Number(item.quantity ?? item.qty ?? 1),
    date: item.issued_date || item.date || item.issuedDate || new Date().toISOString().slice(0, 10),
    issuedDate: item.issued_date || item.date || item.issuedDate || new Date().toISOString().slice(0, 10),
    status: s === "returned" ? "Returned" : s === "condemned" ? "Condemned" : "Active",
  };
}

function normalizeReturn(item) {
  const oldB = item.old_batch_no || item.oldBatchNo || item.batchNo || item.lot_no || item.lotNo || "";
  const newB = item.new_batch_no || item.newBatchNo || "";
  return {
    id: item.id || item.return_id || item.returnId,
    returnId: item.id || item.return_id || item.returnId,
    type: item.type === "exchange" ? "exchange" : "return",
    refNo: item.ref_no || item.refNo || "",
    productName: item.product_name || item.productName || item.product || "Product",
    quantity: Number(item.quantity ?? item.qty ?? 1),
    qty: Number(item.quantity ?? item.qty ?? 1),
    reason: item.reason || "",
    creditNote: item.credit_note || item.creditNote || "",
    returnDate: item.return_date || item.returnDate || new Date().toISOString().slice(0, 10),
    status: item.status || "Pending",
    batchNo: oldB,
    oldBatchNo: oldB,
    newBatchNo: newB,
  };
}

function normalizeFailed(item) {
  return {
    id: item.id || item.ref_no || item.refNo,
    refNo: item.ref_no || item.refNo || item.id,
    product: item.product_name || item.product || item.productName || "Product",
    productName: item.product_name || item.product || item.productName || "Product",
    category: item.category || "General",
    company: item.company_name || item.company || item.companyName || "Vendor",
    lotNo: item.lot_no || item.lotNo || "LOT-001",
    quantity: Number(item.quantity ?? item.qty ?? 1),
    qty: Number(item.quantity ?? item.qty ?? 1),
    failedDate: item.failed_date || item.failedDate || new Date().toISOString().slice(0, 10),
    reason: item.failure_reason || item.failureReason || item.reason || "Failed",
    status: item.status || "failed",
  };
}

export function InventoryProvider({ children }) {
  const [stock, setStock] = useState([]);
  const [failed, setFailed] = useState([]);
  const [issuedItems, setIssuedItems] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStock = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/inventory/`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      const list = data.success ? data.data : data;
      if (Array.isArray(list)) {
        const normalized = list.map(normalizeStock);
        setStock(normalized);
        return normalized;
      }
    } catch (err) { console.error("Stock fetch error:", err); }
    return [];
  }, []);

  const fetchFailed = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/failed-inventory/`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      const list = data.success ? data.data : data;
      if (Array.isArray(list)) {
        const normalized = list.map(normalizeFailed);
        setFailed(normalized);
        return normalized;
      }
    } catch (err) { console.error("Failed fetch error:", err); }
    return [];
  }, []);

  const fetchIssued = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/issued/`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      const list = data.success ? data.data : data;
      if (Array.isArray(list)) {
        const normalized = list.map(normalizeIssued);
        setIssuedItems(normalized);
        return normalized;
      }
    } catch (err) { console.error("Issued fetch error:", err); }
    return [];
  }, []);

  const fetchReturns = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/returns/`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      const list = data.success ? data.data : data;
      if (Array.isArray(list)) {
        const normalized = list.map(normalizeReturn);
        setReturns(normalized);
        return normalized;
      }
    } catch (err) { console.error("Returns fetch error:", err); }
    return [];
  }, []);

  // ⭐ SIMPLIFIED: Fetch data on mount AND when token changes
  const loadAllData = useCallback(async () => {
    const token = localStorage.getItem("dental_token");
    if (!token || token === "null" || token === "undefined") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await Promise.all([fetchStock(), fetchFailed(), fetchIssued(), fetchReturns()]);
      console.log("✅ Inventory data loaded!");
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }, [fetchStock, fetchFailed, fetchIssued, fetchReturns]);

  // Load on mount
  useEffect(() => {
    loadAllData();
  }, []);

  // ⭐ CRITICAL: Check for token changes every 2 seconds (works in same tab!)
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("dental_token");
      const hasData = stock.length > 0 || failed.length > 0 || issuedItems.length > 0 || returns.length > 0;
      if (token && token !== "null" && token !== "undefined" && !hasData) {
        console.log("🔄 Token found, reloading data...");
        loadAllData();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [stock, failed, issuedItems, returns, loadAllData]);

  const getInventoryId = (refNoOrId) => {
    const match = stock.find((s) => s.refNo === refNoOrId || s.id === refNoOrId);
    return match?.id || refNoOrId;
  };

  const issueItem = async ({ studentId, inventoryId, refNo, qty, issueDate }) => {
    try {
      const invId = inventoryId || getInventoryId(refNo);
      const res = await fetch(`${API_URL}/issued/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_id: studentId,
          inventory_id: invId,
          quantity: Number(qty || 1),
          issue_date: issueDate || new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchIssued(), fetchStock()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || "Failed to issue item" };
    } catch (err) {
      console.error("issueItem error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const returnIssuedItem = async (issueId, returnDate, condition = "Good") => {
    try {
      const res = await fetch(`${API_URL}/issued/${issueId}/return`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          return_date: returnDate || new Date().toISOString().slice(0, 10),
          return_condition: condition,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchIssued(), fetchStock()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || "Failed to return item" };
    } catch (err) {
      console.error("returnIssuedItem error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const condemnIssuedItem = async (issueId) => {
    try {
      const res = await fetch(`${API_URL}/issued/${issueId}/condemn`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        await fetchIssued();
        await fetchStock();
        return { success: true };
      }
      return { success: false, message: data.error?.message || "Failed to condemn item" };
    } catch (err) {
      console.error("condemnIssuedItem error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const updateStockItem = async (itemId, patch) => {
    try {
      const realId = getInventoryId(itemId);
      const res = await fetch(`${API_URL}/inventory/${realId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStock();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || "Failed to update item" };
    } catch (err) {
      console.error("updateStockItem error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const toggleStockStatus = async (itemId) => {
    try {
      const realId = getInventoryId(itemId);
      const res = await fetch(`${API_URL}/inventory/${realId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStock();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || "Failed to toggle status" };
    } catch (err) {
      console.error("toggleStockStatus error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const deleteStockItem = async (itemId) => {
    try {
      const realId = getInventoryId(itemId);
      const res = await fetch(`${API_URL}/inventory/${realId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStock();
        return { success: true };
      }
      return { success: false, message: data.error?.message || "Failed to delete item" };
    } catch (err) {
      console.error("deleteStockItem error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const restoreFailedToStock = async (failedId, inventoryData) => {
    try {
      const res = await fetch(`${API_URL}/failed-inventory/${failedId}/restore`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ inventory_data: inventoryData || {} }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchFailed(), fetchStock()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || "Failed to restore item" };
    } catch (err) {
      console.error("restoreFailedToStock error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const markFailedDisposed = async (failedId) => {
    try {
      const res = await fetch(`${API_URL}/failed-inventory/${failedId}/dispose`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        await fetchFailed();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || "Failed to dispose item" };
    } catch (err) {
      console.error("markFailedDisposed error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const addReturn = async (returnData) => {
    try {
      const invId = getInventoryId(returnData.inventoryId || returnData.refNo);
      const res = await fetch(`${API_URL}/returns/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: returnData.type || "exchange",
          inventory_id: invId,
          quantity: Number(returnData.qty || returnData.quantity || 1),
          reason: returnData.reason || "",
          new_batch_no: returnData.newBatchNo || returnData.batchNo,
          credit_note: returnData.creditNote,
          return_date: returnData.returnDate || new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchReturns(), fetchStock()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || "Failed to add return" };
    } catch (err) {
      console.error("addReturn error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const updateReturnStatus = async (returnId, newStatus, extraData = {}) => {
    try {
      const res = await fetch(`${API_URL}/returns/${returnId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: newStatus.toLowerCase(),
          credit_note: extraData.creditNote,
          new_batch_no: extraData.newBatchNo || extraData.batchNo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchReturns(), fetchStock()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || "Failed to update return status" };
    } catch (err) {
      console.error("updateReturnStatus error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const discardReturn = async (returnId) => {
    return updateReturnStatus(returnId, "rejected");
  };

  const value = {
    stock,
    failed,
    issuedItems,
    returns,
    loading,
    fetchStock,
    fetchFailed,
    fetchIssued,
    fetchReturns,
    loadAllData,
    getInventoryId,
    issueItem,
    returnIssuedItem,
    condemnIssuedItem,
    updateStockItem,
    toggleStockStatus,
    deleteStockItem,
    restoreFailedToStock,
    markFailedDisposed,
    addReturn,
    updateReturnStatus,
    discardReturn,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within an InventoryProvider");
  return ctx;
}