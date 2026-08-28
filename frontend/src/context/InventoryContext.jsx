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

// ⭐ NORMALIZE STOCK - Each unit is separate
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
    isReturnable: item.is_returnable !== undefined ? item.is_returnable : true,
    documentType: item.document_type || item.documentType || "invoice",
    documentNumber: item.document_number || item.documentNumber || item.invoice_no || item.invoiceNo || "",
    invoiceNo: item.invoice_no || item.invoiceNo || item.document_number || item.documentNumber || "",
    created: item.created_at || item.createdAt || item.created || "",
    createdAt: item.created_at || item.createdAt || item.created || "",
    createdBy: item.created_by || item.createdBy || "",
  };
}

// ⭐ NORMALIZE ISSUED - Track by inventory_id (unit)
function normalizeIssued(item) {
  return {
    id: item.id || item.issue_id || item.issueId,
    issueId: item.id || item.issue_id || item.issueId,
    inventoryId: item.inventory_id || item.inventoryId || item.inventory_id, // ⭐ CRITICAL
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
    returnDate: item.return_date || item.returnDate || null,
    status: item.status === "returned" ? "Returned" : item.status === "condemned" ? "Condemned" : "Active",
  };
}

function normalizeReturn(item) {
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
    batchNo: item.old_batch_no || item.batchNo || item.lot_no || item.lotNo || "",
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

  // ⭐ FETCH ALL DATA
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

  useEffect(() => {
    loadAllData();
  }, []);

  // ⭐ ISSUE ITEM - Track by individual inventory_id
  const issueItem = async ({ studentId, inventoryId, refNo, qty, issueDate, stockType = "fresh" }) => {
    try {
      const payload = {
        student_id: studentId,
        inventory_id: inventoryId,  // ⭐ Individual unit ID
        ref_no: refNo,
        quantity: Number(qty),
        issue_date: issueDate,
        stock_type: stockType,
      };

      const res = await fetch(`${API_URL}/issued/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        // Update stock - decrease quantity for the specific unit
        setStock(prev => prev.map(s => 
          s.id === inventoryId ? { ...s, quantity: s.quantity - Number(qty) } : s
        ));
        await fetchIssued();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Issue error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ RETURN ITEM
  const returnIssuedItem = async (issueId, returnDate, condition = "Good") => {
    try {
      const res = await fetch(`${API_URL}/issued/${issueId}/return`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ return_date: returnDate, return_condition: condition }),
      });
      const data = await res.json();
      if (data.success) {
        // Find the issued item to know which inventory_id to update
        const issuedItem = issuedItems.find(i => i.issueId === issueId);
        if (issuedItem) {
          // Increase stock for the specific unit
          setStock(prev => prev.map(s => 
            s.id === issuedItem.inventoryId ? { ...s, quantity: s.quantity + issuedItem.quantity } : s
          ));
        }
        await fetchIssued();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Return error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ CONDEMN ITEM
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
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Condemn error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ UPDATE STOCK ITEM
  const updateStockItem = async (itemId, patch) => {
    try {
      const res = await fetch(`${API_URL}/inventory/${itemId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStock();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Update error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ TOGGLE STATUS
  const toggleStockStatus = async (itemId) => {
    try {
      const res = await fetch(`${API_URL}/inventory/${itemId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStock();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Toggle status error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ DELETE STOCK ITEM
  const deleteStockItem = async (itemId) => {
    try {
      const res = await fetch(`${API_URL}/inventory/${itemId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await fetchStock();
        return { success: true };
      }
      return { success: false, message: "Delete failed" };
    } catch (error) {
      console.error("Delete error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ ADD STOCK ITEM
  const addStockItem = async (itemData) => {
    try {
      const payload = {
        ref_no: itemData.refNo || itemData.ref_no,
        product_name: itemData.productName || itemData.product || itemData.product_name,
        category: itemData.category,
        company_name: itemData.companyName || itemData.company || itemData.company_name,
        size: itemData.size,
        lot_no: itemData.lotNo || itemData.lot_no,
        quantity: Number(itemData.quantity ?? itemData.qty ?? 1),
        expiry_date: itemData.expiryDate || itemData.expiry || itemData.expiry_date,
        document_type: itemData.documentType || itemData.document_type || "invoice",
        document_number: itemData.documentNumber || itemData.document_number || itemData.invoiceNo || itemData.invoice_no || itemData.creditNoteNo || itemData.credit_note_no || "",
      };

      const res = await fetch(`${API_URL}/inventory/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        await fetchStock();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || data.message || "Failed to add stock item" };
    } catch (error) {
      console.error("Add stock error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ GET INVENTORY ID BY REF_NO (for compatibility)
  const getInventoryId = useCallback((refNo) => {
    const item = stock.find(s => s.refNo === refNo || s.id === refNo);
    return item?.id || refNo;
  }, [stock]);

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
    addStockItem,
    issueItem,
    returnIssuedItem,
    condemnIssuedItem,
    updateStockItem,
    toggleStockStatus,
    deleteStockItem,
    getInventoryId,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within an InventoryProvider");
  return ctx;
}