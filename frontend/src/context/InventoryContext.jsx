import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

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
    id: item.unit_id || item.id || item.ref_no || item.refNo,
    unitId: item.unit_id || item.id || item.ref_no || item.refNo,
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
    isReturned: Boolean(item.is_returned || item.isReturned),
    // ⭐ FIXED: Use ?? 10 instead of || 5
    lowStockThreshold: item.low_stock_threshold ?? item.lowStockThreshold ?? 10,
    isReturnable: item.is_returnable !== undefined ? item.is_returnable : true,
    documentType: item.document_type || item.documentType || "invoice",
    documentNumber: item.document_number || item.documentNumber || item.invoice_no || item.invoiceNo || "",
    invoiceNo: item.invoice_no || item.invoiceNo || item.document_number || item.documentNumber || "",
    created: item.created_at || item.createdAt || item.created || "",
    createdAt: item.created_at || item.createdAt || item.created || "",
    createdBy: item.created_by || item.createdBy || "",
  };
}

// ⭐ NORMALIZE ISSUED - Track by unit_id
function normalizeIssued(item) {
  const resolvedUnitId = item.unit_id || item.unitId || item.inventory_id || item.inventoryId || "";
  return {
    id: item.id || item.issue_id || item.issueId,
    issueId: item.id || item.issue_id || item.issueId,
    unitId: resolvedUnitId,
    inventoryId: resolvedUnitId,
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
    status: (item.status?.toLowerCase() === "returned" || item.status === "Returned") 
      ? "Returned" 
      : (item.status?.toLowerCase() === "condemned" || item.status === "Condemned") 
      ? "Condemned" 
      : (item.status?.toLowerCase() === "vendor_exchange" || item.status === "Vendor Exchange") 
      ? "Vendor Exchange" 
      : "Active",
    created: item.created_at || item.createdAt || "",
    createdAt: item.created_at || item.createdAt || "",
    // ⭐ ADD THESE - CRITICAL FOR IMPLANT/ABUTMENT DETECTION
    isImplantAbutment: Boolean(item.isImplantAbutment ?? item.is_implant_abutment ?? false),
    is_implant_abutment: Boolean(item.isImplantAbutment ?? item.is_implant_abutment ?? false),
    category: item.category || "",
  };
}

function normalizeReturn(item) {
  const resolvedUnitId = item.unit_id || item.unitId || item.inventory_id || item.inventoryId || "";
  const cnUsed = Boolean(item.credit_note_used ?? item.creditNoteUsed ?? item.is_credit_note_used ?? item.isCreditNoteUsed ?? false);
  return {
    id: item.id || item.return_id || item.returnId,
    returnId: item.id || item.return_id || item.returnId,
    type: item.type === "exchange" ? "exchange" : "return",
    unitId: resolvedUnitId,
    inventoryId: resolvedUnitId,
    refNo: item.ref_no || item.refNo || "",
    productName: item.product_name || item.productName || item.product || "Product",
    quantity: Number(item.quantity ?? item.qty ?? 1),
    qty: Number(item.quantity ?? item.qty ?? 1),
    reason: item.reason || "",
    creditNote: item.credit_note || item.creditNote || "",
    creditNoteUsed: cnUsed,
    is_credit_note_used: cnUsed,
    isCreditNoteUsed: cnUsed,
    replacementUnitId: item.replacement_unit_id || item.replacementUnitId || "",
    returnDate: item.return_date || item.returnDate || new Date().toISOString().slice(0, 10),
    status: item.status || "Pending",
    batchNo: item.old_batch_no || item.batchNo || item.lot_no || item.lotNo || "",
    newBatchNo: item.new_batch_no || item.newBatchNo || "",
    new_batch_no: item.new_batch_no || item.newBatchNo || "",
    created: item.created_at || item.createdAt || "",
    createdAt: item.created_at || item.createdAt || "",
  };
}

function normalizeFailed(item) {
  const resolvedUnitId = item.unit_id || item.unitId || item.original_inventory_id || item.originalInventoryId || item.id;
  return {
    id: item.id || item.ref_no || item.refNo,
    refNo: item.ref_no || item.refNo || item.id,
    unitId: resolvedUnitId,
    originalInventoryId: resolvedUnitId,
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
    created: item.created_at || item.createdAt || "",
    createdAt: item.created_at || item.createdAt || "",
  };
}

export function InventoryProvider({ children }) {
  const { isAuthenticated } = useAuth();
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
    if (!isAuthenticated) {
      setStock([]);
      setFailed([]);
      setIssuedItems([]);
      setReturns([]);
      setLoading(false);
      return;
    }
    loadAllData();
  }, [isAuthenticated, loadAllData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("dental_token");
      if (token && token !== "null" && token !== "undefined" && stock.length === 0 && isAuthenticated) {
        console.log("🔄 Token active, reloading inventory data...");
        loadAllData();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [stock.length, isAuthenticated, loadAllData]);

  // ⭐ GET UNIT HISTORY
  const getUnitHistory = useCallback((unitId) => {
    return (issuedItems || [])
      .filter(i => i.unitId === unitId)
      .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
  }, [issuedItems]);

  // ⭐ BATCH ISSUE ITEMS
  const batchIssueItems = async ({ items }) => {
    try {
      const payload = { items };
      const res = await fetch(`${API_URL}/issued/batch`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        Promise.all([fetchStock(), fetchIssued()]).catch(err => console.error("Sync error:", err));
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || "Batch issue failed" };
    } catch (error) {
      console.error("Batch issue error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ ISSUE ITEM - Single unit
  const issueItem = async ({ studentId, inventoryId, unitId, refNo, qty, issueDate, stockType = "fresh" }) => {
    try {
      const targetId = inventoryId || unitId || refNo;
      const payload = {
        student_id: studentId,
        inventory_id: targetId,
        unit_id: targetId,
        ref_no: refNo,
        quantity: Number(qty || 1),
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
        Promise.all([fetchStock(), fetchIssued()]).catch(err => console.error("Sync error:", err));
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || data.message || "Failed to issue item" };
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
        Promise.all([fetchStock(), fetchIssued()]).catch(err => console.error("Sync error:", err));
        console.log("✅ Return completed, data refreshed");
        return { success: true, data: data.data, qr_data: data.qr_data };
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
        Promise.all([fetchIssued(), fetchStock()]).catch(err => console.error("Sync error:", err));
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
  const toggleStockStatus = async (itemId, targetStatus = null) => {
    try {
      const payload = targetStatus ? { status: targetStatus } : {};
      const res = await fetch(`${API_URL}/inventory/${encodeURIComponent(itemId)}/status`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: targetStatus ? JSON.stringify(payload) : undefined,
      });
      const data = await res.json();
      if (data.success) {
        await fetchStock();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || data.message || "Failed to update status" };
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

  // ⭐ MOVE STOCK TO FAILED INVENTORY
  const moveStockToFailed = async (itemId, reason = "Damaged", quantity = 1, itemDetails = {}) => {
    try {
      const payload = {
        inventory_id: itemId,
        unit_id: itemId,
        id: itemId,
        ref_no: itemDetails.refNo || itemDetails.ref_no || itemId,
        product_name: itemDetails.product || itemDetails.productName || itemDetails.product_name,
        category: itemDetails.category,
        company_name: itemDetails.company || itemDetails.companyName || itemDetails.company_name,
        size: itemDetails.size,
        lot_no: itemDetails.lotNo || itemDetails.lot_no,
        expiry_date: itemDetails.expiry || itemDetails.expiryDate || itemDetails.expiry_date,
        failure_reason: reason,
        reason: reason,
        quantity: Number(quantity) || 1,
      };

      const res = await fetch(`${API_URL}/failed-inventory/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchFailed()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || data.message || "Failed to move item to failed inventory" };
    } catch (error) {
      console.error("Move to failed error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ RESTORE FAILED ITEM TO STOCK
  const restoreFailedToStock = async (failedId, inventoryData) => {
    try {
      const res = await fetch(`${API_URL}/failed-inventory/${failedId}/restore`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ inventory_data: inventoryData }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchFailed()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || data.message || "Failed to restore item" };
    } catch (error) {
      console.error("Restore failed item error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ MARK FAILED ITEM DISPOSED
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
      return { success: false, message: data.error?.message || data.message || "Failed to dispose item" };
    } catch (error) {
      console.error("Dispose error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ ADD RETURN / EXCHANGE / CREDIT NOTE
  const addReturn = async (returnData) => {
    try {
      const payload = {
        type: returnData.type || "exchange",
        inventory_id: returnData.inventoryId || returnData.inventory_id || returnData.unitId || returnData.unit_id || returnData.refNo || returnData.ref_no,
        unit_id: returnData.unitId || returnData.unit_id || returnData.inventoryId || returnData.inventory_id,
        ref_no: returnData.refNo || returnData.ref_no,
        product_name: returnData.productName || returnData.product,
        old_batch_no: returnData.oldBatchNo || returnData.batchNo || returnData.old_batch_no,
        new_batch_no: returnData.newBatchNo || returnData.new_batch_no,
        quantity: Number(returnData.quantity || returnData.qty || 1),
        reason: returnData.reason || "",
        return_date: returnData.returnDate || returnData.return_date || new Date().toISOString().slice(0, 10),
        credit_note: returnData.creditNote || returnData.credit_note || "",
      };

      const res = await fetch(`${API_URL}/returns/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        await fetchReturns();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || data.message || "Failed to create return record" };
    } catch (error) {
      console.error("Add return error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ UPDATE RETURN / EXCHANGE STATUS
  const updateReturnStatus = async (returnId, status, extraData = {}) => {
    try {
      const normalizedStatus = String(status || "").toLowerCase().replace(/\s+/g, "_");
      const payload = {
        status: normalizedStatus,
        credit_note: typeof extraData === "string" ? extraData : extraData?.creditNote || extraData?.credit_note,
        new_batch_no: typeof extraData === "object" ? extraData?.newBatchNo || extraData?.new_batch_no : undefined,
        is_credit_note_used: typeof extraData === "object" ? (extraData?.is_credit_note_used ?? extraData?.isCreditNoteUsed ?? extraData?.creditNoteUsed) : undefined,
        replacement_unit_id: typeof extraData === "object" ? (extraData?.replacement_unit_id ?? extraData?.replacementUnitId) : undefined,
      };

      const res = await fetch(`${API_URL}/returns/${returnId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchReturns(), fetchStock()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message || data.message || "Failed to update return status" };
    } catch (error) {
      console.error("Update return status error:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ⭐ DISCARD / DELETE RETURN OR CREDIT NOTE
  const discardReturn = async (returnId) => {
    try {
      const res = await fetch(`${API_URL}/returns/${returnId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (data.success) {
        await fetchReturns();
        return { success: true };
      }
      return { success: false, message: data.error?.message || data.message || "Failed to remove return record" };
    } catch (error) {
      console.error("Delete return error:", error);
      return { success: false, message: "Network error" };
    }
  };

  const deleteReturn = discardReturn;

  // ⭐ GET INVENTORY ID BY REF_NO (for compatibility)
  const getInventoryId = useCallback((refNo) => {
    const item = stock.find(s => s.refNo === refNo || s.id === refNo);
    return item?.id || refNo;
  }, [stock]);

  // ⭐ EXCHANGE WITH VENDOR (For Implants/Abutments)
  const exchangeWithVendor = async (issueId, returnDate, newBatchNo) => {
    try {
      const res = await fetch(`${API_URL}/issued/${issueId}/exchange`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          return_date: returnDate,
          new_batch_no: newBatchNo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // ⭐ IMPORTANT: Refresh ALL data including returns
        await Promise.all([fetchStock(), fetchIssued(), fetchReturns()]);
        console.log("✅ Exchange completed, data refreshed");
        return { success: true, data: data.data };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Exchange error:", error);
      return { success: false, message: "Network error" };
    }
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
    addStockItem,
    issueItem,
    batchIssueItems,
    returnIssuedItem,
    condemnIssuedItem,
    exchangeWithVendor,  // ⭐ ADD THIS
    updateStockItem,
    toggleStockStatus,
    deleteStockItem,
    moveStockToFailed,
    restoreFailedToStock,
    markFailedDisposed,
    addReturn,
    updateReturnStatus,
    discardReturn,
    deleteReturn,
    getInventoryId,
    getUnitHistory,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within an InventoryProvider");
  return ctx;
}

// ⭐ RETURN ITEM (returns QR data)
const returnIssuedItem = async (issueId, returnDate, condition = "Good") => {
    try {
        const res = await fetch(`${API_URL}/issued/${issueId}/return`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({ return_date: returnDate, return_condition: condition }),
        });
        const data = await res.json();
        if (data.success) {
            await Promise.all([fetchStock(), fetchIssued()]);
            console.log("✅ Return completed, data refreshed");
            // ⭐ Return QR data from response
            return { 
                success: true, 
                data: data.data,
                qr_data: data.qr_data  // ⭐ QR data from backend
            };
        }
        return { success: false, message: data.error?.message };
    } catch (error) {
        console.error("Return error:", error);
        return { success: false, message: "Network error" };
    }
};