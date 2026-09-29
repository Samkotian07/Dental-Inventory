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

// ---------- NORMALIZERS ----------

function normalizeStock(item) {
  // item comes from v_available_stock
  return {
    id: item.refNo || item.ref_no,
    unitId: item.refNo || item.ref_no,
    refNo: item.refNo || item.ref_no,
    product: item.product || item.productName || "Product",
    productName: item.productName || item.product || "Product",
    company: item.company || item.companyName || "Vendor",
    companyName: item.companyName || item.company || "Vendor",
    category: item.category || "General",
    groupCode: item.groupCode || item.group_code || "",
    isReturnable: item.isReturnable !== undefined ? item.isReturnable : true,
    freshStock: Number(item.freshStock ?? 0),
    returnedStock: Number(item.returnedStock ?? 0),
    totalAvailable: Number(item.totalAvailable ?? item.quantity ?? 0),
    quantity: Number(item.totalAvailable ?? item.quantity ?? 0),
    qty: Number(item.totalAvailable ?? item.quantity ?? 0),
    issuedCount: Number(item.issuedCount ?? 0),
    failedCount: Number(item.failedCount ?? 0),
    stockStatus: item.stockStatus || "OK",
    freshLocation: item.freshLocation || "",
    returnedLocation: item.returnedLocation || "",
    lowStockThreshold: item.lowStockThreshold ?? 10,
  };
}

function normalizeLot(item) {
  return {
    lotId: item.lotId || item.lot_id,
    refNo: item.refNo || item.ref_no,
    lotNo: item.lotNo || item.lot_no,
    invoiceNo: item.invoiceNo || item.invoice_no || "",
    expiryDate: item.expiryDate || item.expiry_date || "",
    qtyReceived: Number(item.qtyReceived ?? 0),
    qtyAvailable: Number(item.qtyAvailable ?? 0),
    qtyFresh: Number(item.qtyFresh ?? 0),
    qtyReturned: Number(item.qtyReturned ?? 0),
    status: item.status || "open",
    freshLocation: item.freshLocation || "",
    returnedLocation: item.returnedLocation || "",
  };
}

function normalizeIssuedUnit(item) {
  return {
    unitId: item.unitId || item.unit_id,
    issueId: item.issueId || item.issue_id,
    refNo: item.refNo || item.ref_no,
    lotNo: item.lotNo || item.lot_no,
    product: item.productName || item.product_name || "Product",
    productName: item.productName || item.product_name || "Product",
    category: item.category || "",
    isImplantAbutment: Boolean(item.isImplantAbutment ?? item.is_implant_abutment ?? false),
    status: item.status,
    issuedDate: item.issuedDate || item.issued_date,
    returnedDate: item.returnedDate || item.returned_date,
    returnCondition: item.returnCondition || item.return_condition,
    returnedBy: item.returnedBy || item.returned_by,
    qrCode: item.qrCode || item.qr_code,
  };
}

function normalizeIssue(item) {
  // item is an issue_events row with nested units[]
  const units = (item.units || []).map(normalizeIssuedUnit);
  return {
    issueId: item.issueId || item.issue_id,
    studentId: item.studentId || item.student_id,
    student: item.studentName || item.student_name || "Student",
    studentName: item.studentName || item.student_name || "Student",
    issueDate: item.issueDate || item.issue_date,
    issuedBy: item.issuedBy || item.issued_by,
    remarks: item.remarks || "",
    overallStatus: item.overallStatus || "issued",
    createdAt: item.createdAt || item.created_at,
    units,
  };
}

function normalizeReturn(item) {
  const first = (item.items && item.items[0]) || {};
  return {
    returnId: item.returnId || item.return_id,
    type: item.type || item.return_type,
    vendorId: item.vendorId || item.vendor_id,
    returnDate: item.returnDate || item.return_date,
    reason: item.reason || "",
    status: item.status || "pending",
    createdBy: item.createdBy || item.created_by,
    completedAt: item.completedAt || item.completed_at,
    createdAt: item.createdAt || item.created_at,
    // Flattened convenience fields for existing UI
    refNo: first.refNo || "",
    productName: first.productName || "",
    quantity: first.quantity || 0,
    batchNo: first.lotNo || "",
    newBatchNo: first.replacementLotNo || "",
    creditNote: "",
    items: item.items || [],
  };
}

function normalizeFailed(item) {
  return {
    id: item.id,
    lotId: item.lotId || item.lot_id,
    refNo: item.refNo || item.ref_no,
    lotNo: item.lotNo || item.lot_no,
    product: item.productName || item.product_name || "Product",
    productName: item.productName || item.product_name || "Product",
    category: item.category || "",
    vendorName: item.vendorName || item.vendor_name || "",
    quantity: Number(item.quantity ?? 0),
    failureType: item.failureType || item.failure_type,
    failureReason: item.failureReason || item.failure_reason,
    status: item.status || "pending",
    movedBy: item.movedBy || item.moved_by,
    restoredLotId: item.restoredLotId || item.restored_lot_id,
    vendorReturnId: item.vendorReturnId || item.vendor_return_id,
    createdAt: item.createdAt || item.created_at,
  };
}


export function InventoryProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [stock, setStock] = useState([]);
  const [failed, setFailed] = useState([]);
  const [issues, setIssues] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------- FETCHERS ----------

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
      const res = await fetch(`${API_URL}/failed/`, { headers: getAuthHeaders() });
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

  const fetchIssues = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/issued/`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      const list = data.success ? data.data : data;
      if (Array.isArray(list)) {
        const normalized = list.map(normalizeIssue);
        setIssues(normalized);
        return normalized;
      }
    } catch (err) { console.error("Issues fetch error:", err); }
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

  const loadAllData = useCallback(async () => {
    const token = localStorage.getItem("dental_token");
    if (!token || token === "null" || token === "undefined") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await Promise.all([fetchStock(), fetchFailed(), fetchIssues(), fetchReturns()]);
      console.log("✅ Inventory data loaded!");
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }, [fetchStock, fetchFailed, fetchIssues, fetchReturns]);

  useEffect(() => {
    if (!isAuthenticated) {
      setStock([]);
      setFailed([]);
      setIssues([]);
      setReturns([]);
      setLoading(false);
      return;
    }
    loadAllData();
  }, [isAuthenticated, loadAllData]);

  // ---------- HELPERS ----------

  const getLotsForRef = useCallback(async (refNo) => {
    try {
      const res = await fetch(`${API_URL}/inventory/available-lots/${encodeURIComponent(refNo)}`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      const list = data.success ? data.data : data;
      return Array.isArray(list) ? list.map(normalizeLot) : [];
    } catch (err) {
      console.error("Lots fetch error:", err);
      return [];
    }
  }, []);

  const getReturnedUnitsForRef = useCallback(async (refNo) => {
    // Filter already-loaded issues for returned units of this ref
    const found = [];
    issues.forEach(issue => {
      (issue.units || []).forEach(u => {
        if (u.refNo === refNo && u.status === 'returned_good') {
          found.push({
            ...u,
            issueId: issue.issueId,
            student: issue.student,
            studentId: issue.studentId,
          });
        }
      });
    });
    return found;
  }, [issues]);

  // ---------- MUTATIONS ----------

  const issueFreshUnit = async ({ studentId, refNo, lotId, issueDate }) => {
    try {
      const res = await fetch(`${API_URL}/issued/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_id: studentId,
          ref_no: refNo,
          lot_id: lotId,
          issue_date: issueDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchIssues()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Failed to issue" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const issueReturnedUnit = async ({ studentId, unitSerial, issueDate }) => {
    try {
      const res = await fetch(`${API_URL}/issued/returned-unit`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_id: studentId,
          unit_serial: unitSerial,
          issue_date: issueDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchIssues()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Failed to reissue" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const returnUnit = async (unitSerial, condition = "Good") => {
    try {
      const res = await fetch(`${API_URL}/issued/${encodeURIComponent(unitSerial)}/return`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ condition }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchIssues()]);
        return { success: true, data: data.data, qr_data: data.qr_data };
      }
      return { success: false, message: data.message || "Failed to return" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const condemnUnit = async (unitSerial, reason = "Damaged") => {
    try {
      const res = await fetch(`${API_URL}/issued/${encodeURIComponent(unitSerial)}/condemn`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchIssues(), fetchStock(), fetchFailed()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Failed to condemn" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const exchangeWithVendor = async (unitSerial, reason = "Defective") => {
    try {
      const res = await fetch(`${API_URL}/issued/${encodeURIComponent(unitSerial)}/exchange`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchIssues(), fetchReturns()]);
        return { success: true, returnId: data.returnId };
      }
      return { success: false, message: data.message || "Failed to exchange" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const markUsedInPatient = async (unitSerial) => {
    try {
      const res = await fetch(`${API_URL}/issued/${encodeURIComponent(unitSerial)}/used-in-patient`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        await fetchIssues();
        return { success: true };
      }
      return { success: false, message: data.message || "Failed" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const moveToFailed = async ({ lotId, quantity, failureType, failureReason }) => {
    try {
      const res = await fetch(`${API_URL}/failed/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          lot_id: lotId,
          quantity,
          failure_type: failureType,
          failure_reason: failureReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchFailed()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Failed" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const restoreFailed = async (failId) => {
    try {
      const res = await fetch(`${API_URL}/failed/${failId}/restore`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchFailed()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Failed" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const disposeFailed = async (failId, remarks) => {
    try {
      const res = await fetch(`${API_URL}/failed/${failId}/dispose`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ remarks }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchFailed();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Failed" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const completeVendorReturn = async (returnId, { newLotNo, newQty, creditNoteNo, creditAmount }) => {
    try {
      const res = await fetch(`${API_URL}/returns/${returnId}/complete`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          new_lot_no: newLotNo,
          new_qty: newQty,
          credit_note_no: creditNoteNo,
          credit_amount: creditAmount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchReturns()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Failed" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const sendOverstockToVendor = async ({ lotId, quantity, vendorId, reason }) => {
    try {
      const res = await fetch(`${API_URL}/returns/overstock`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ lot_id: lotId, quantity, vendor_id: vendorId, reason }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchReturns()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Failed" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const deleteReturn = async (returnId) => {
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
      return { success: false, message: data.message || "Failed" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  // ---------- CONTEXT VALUE ----------

  const value = {
    stock,
    failed,
    issues,
    returns,
    loading,
    fetchStock,
    fetchFailed,
    fetchIssues,
    fetchReturns,
    loadAllData,
    getLotsForRef,
    getReturnedUnitsForRef,
    issueFreshUnit,
    issueReturnedUnit,
    returnUnit,
    condemnUnit,
    exchangeWithVendor,
    markUsedInPatient,
    moveToFailed,
    restoreFailed,
    disposeFailed,
    completeVendorReturn,
    sendOverstockToVendor,
    deleteReturn,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within an InventoryProvider");
  return ctx;
}