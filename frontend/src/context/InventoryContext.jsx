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
  // Each inventory row is one stock lot, so quantities remain lot-specific.
  return {
    id: item.lotId || item.lot_id || item.refNo || item.ref_no,
    lotId: item.lotId || item.lot_id || "",
    unitId: item.lotId || item.lot_id || item.refNo || item.ref_no,
    refNo: item.refNo || item.ref_no,
    product: item.product || item.productName || "Product",
    productName: item.productName || item.product || "Product",
    company: item.company || item.companyName || "Vendor",
    companyName: item.companyName || item.company || "Vendor",
    category: item.category || "General",
    groupCode: item.groupCode || item.group_code || "",
    isReturnable: item.isReturnable !== undefined ? item.isReturnable : true,
    freshStock: Number(item.freshStock ?? item.qtyFresh ?? item.qty_fresh ?? item.fresh_stock ?? 0),
    returnedStock: Number(item.returnedStock ?? item.qtyReturned ?? item.qty_returned ?? item.returned_stock ?? item.returnedCount ?? 0),
    returnedCount: Number(item.returnedStock ?? item.qtyReturned ?? item.qty_returned ?? item.returned_stock ?? item.returnedCount ?? 0),
    isReturned: Boolean(item.isReturned || (Number(item.returnedStock ?? item.qtyReturned ?? item.qty_returned ?? 0) > 0 && Number(item.freshStock ?? item.qtyFresh ?? item.qty_fresh ?? 0) === 0)),
    totalAvailable: Number(item.totalAvailable ?? item.quantity ?? 0),
    quantity: Number(item.totalAvailable ?? item.quantity ?? 0),
    qty: Number(item.totalAvailable ?? item.quantity ?? 0),
    issuedCount: Number(item.issuedCount ?? 0),
    failedCount: Number(item.failedCount ?? 0),
    stockStatus: item.stockStatus || "OK",
    freshLocation: item.freshLocation || "",
    returnedLocation: item.returnedLocation || "",
    lotNo: item.lotNo || item.lot_no || "",
    expiry: item.expiry || item.expiryDate || item.expiry_date || "",
    invoiceNo: item.invoiceNo || item.invoice_no || "",
    size: item.size || item.groupSize || "",
    lowStockThreshold: item.lowStockThreshold ?? 10,
    isActive: item.isActive !== undefined ? Boolean(item.isActive) : (item.is_active !== undefined ? Boolean(item.is_active) : (item.status !== "inactive")),
    status: (item.isActive === false || item.is_active === 0 || item.status === "inactive") ? "inactive" : "active",
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

function mapIssueStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "issued" || s === "active") return "Active";
  if (s.includes("return")) return "Returned";
  if (s === "condemned") return "Condemned";
  if (s === "awaiting_vendor" || s === "exchanged" || s === "credited" || s.includes("vendor")) return "Vendor Exchange";
  return "Active";
}

function normalizeIssue(item) {
  // item is an issue_events row with nested units[]
  const units = (item.units || []).map(normalizeIssuedUnit);
  const first = units[0] || {};
  return {
    id: item.issueId || item.issue_id,
    issueId: item.issueId || item.issue_id,
    studentId: item.studentId || item.student_id,
    student: item.studentName || item.student_name || "Student",
    studentName: item.studentName || item.student_name || "Student",
    issueDate: item.issueDate || item.issue_date,
    issuedBy: item.issuedBy || item.issued_by,
    remarks: item.remarks || "",
    overallStatus: item.overallStatus || "issued",
    createdAt: item.createdAt || item.created_at,
    // Flattened convenience fields for UI display & actions:
    product: first.product || first.productName || item.product || item.productName || "Product",
    productName: first.productName || first.product || item.productName || item.product || "Product",
    lotNo: first.lotNo || item.lotNo || "",
    refNo: first.refNo || item.refNo || "",
    unitId: first.unitId || item.unitId || "",
    unitSerial: first.unitId || item.unitId || "",
    category: first.category || "",
    isImplantAbutment: Boolean(first.isImplantAbutment),
    qty: units.length || 1,
    quantity: units.length || 1,
    date: item.issueDate || item.issue_date,
    returnDate: first.returnedDate || item.returnedDate || item.returnDate || null,
    returnedDate: first.returnedDate || item.returnedDate || item.returnDate || null,
    status: mapIssueStatus(first.status || item.overallStatus || "Active"),
    units,
  };
}

function mapReturnStatus(raw) {
  const s = String(raw || "").toLowerCase().replace(/\s+/g, "_");
  if (s === "completed") return "Completed";
  if (s === "in_progress" || s === "inprogress") return "In Progress";
  if (s === "rejected") return "Rejected";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  return "Pending";
}

function normalizeReturn(item) {
  const first = (item.items && item.items[0]) || {};
  const replLot = first.replacementLotNo || item.replacementLotNo || item.newBatchNo || item.new_lot_no || first.replacement_lot_no || "";
  const cn = item.creditNote || item.creditNoteNo || item.credit_note || item.credit_note_no || first.creditNote || first.credit_note || "";

  return {
    returnId: item.returnId || item.return_id,
    type: (item.type === "credit_note" || item.type === "creditNote") ? "creditNote" : (item.type || item.return_type || "exchange"),
    vendorId: item.vendorId || item.vendor_id,
    returnDate: item.returnDate || item.return_date,
    reason: item.reason || "",
    status: mapReturnStatus(item.status),
    createdBy: item.createdBy || item.created_by,
    completedAt: item.completedAt || item.completed_at,
    createdAt: item.createdAt || item.created_at,
    // Flattened convenience fields for existing UI
    refNo: first.refNo || item.refNo || "",
    productName: first.productName || item.productName || "",
    quantity: first.quantity || item.quantity || 0,
    batchNo: first.lotNo || item.lotNo || "",
    newBatchNo: replLot,
    replacementLotNo: replLot,
    creditNote: cn,
    creditNoteNo: cn,
    creditNoteOrRepl: replLot || cn || "",
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
    qty: Number(item.quantity ?? 0),
    failureType: item.failureType || item.failure_type,
    failureReason: item.failureReason || item.failure_reason,
    reason: item.reason || item.failureReason || item.failure_reason || item.failureType || item.failure_type || "Damaged",
    status: item.status || "pending",
    movedBy: item.movedBy || item.moved_by,
    restoredLotId: item.restoredLotId || item.restored_lot_id,
    vendorReturnId: item.vendorReturnId || item.vendor_return_id,
    createdAt: item.createdAt || item.created_at,
    updatedAt: item.updatedAt || item.updated_at || "",
    date: item.updatedAt || item.updated_at || item.createdAt || item.created_at || "",
    failedDate: item.updatedAt || item.updated_at || item.createdAt || item.created_at || "",
  };
}


export function InventoryProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [failed, setFailed] = useState([]);
  const [issues, setIssues] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------- FETCHERS ----------

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/inventory/products`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      const list = data.success ? data.data : data;
      if (Array.isArray(list)) {
        setProducts(list);
        return list;
      }
    } catch (err) { console.error("Products fetch error:", err); }
    return [];
  }, []);

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
      await Promise.all([fetchProducts(), fetchStock(), fetchFailed(), fetchIssues(), fetchReturns()]);
      console.log("✅ Inventory data loaded!");
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }, [fetchProducts, fetchStock, fetchFailed, fetchIssues, fetchReturns]);

  useEffect(() => {
    if (!isAuthenticated) {
      setProducts([]);
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
    try {
      const res = await fetch(`${API_URL}/inventory/returned-units/${encodeURIComponent(refNo)}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.success && Array.isArray(data.data) ? data.data : [];
    } catch (err) {
      console.error("Returned units fetch error:", err);
      return [];
    }
  }, []);

  const getUnitHistory = useCallback(async (identifier) => {
    try {
      const res = await fetch(`${API_URL}/inventory/unit-history/${encodeURIComponent(identifier)}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data : null;
    } catch (err) {
      console.error("Unit history fetch error:", err);
      return null;
    }
  }, []);

  // ---------- MUTATIONS ----------

  const issueFreshUnit = async ({ studentId, refNo, lotId, quantity, qty, issueDate }) => {
    try {
      const issueQty = Math.max(1, parseInt(quantity ?? qty ?? 1, 10) || 1);
      if (issueQty > 1) {
        return await issueBulkUnits({ studentId, refNo, lotId, quantity: issueQty, issueDate });
      }
      const res = await fetch(`${API_URL}/issued/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_id: studentId,
          ref_no: refNo,
          lot_id: lotId,
          quantity: 1,
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

  const returnUnit = async (unitSerial, condition = "Good", returnDate = null) => {
    try {
      const res = await fetch(`${API_URL}/issued/${encodeURIComponent(unitSerial)}/return`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ condition, return_date: returnDate }),
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

  const sendOverstockToVendor = async ({ lotId, quantity, vendorId, reason, returnDate }) => {
    try {
      const res = await fetch(`${API_URL}/returns/overstock`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          lot_id: lotId,
          quantity: Number(quantity),
          ...(vendorId ? { vendor_id: Number(vendorId) } : {}),
          reason: reason || "Overstock",
          ...(returnDate ? { return_date: returnDate } : {}),
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

  const deleteReturn = async (returnId) => {
    try {
      const res = await fetch(`${API_URL}/returns/${encodeURIComponent(returnId)}`, {
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

  const updateReturnStatus = async (returnId, newStatus, extraData = {}) => {
    try {
      const payload = {
        status: newStatus.toLowerCase().replace(/\s+/g, "_"),
        ...extraData,
      };
      const res = await fetch(`${API_URL}/returns/${encodeURIComponent(returnId)}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchReturns(), fetchStock()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Failed to update return status" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const discardReturn = async (returnId) => {
    // If admin → DELETE /api/returns/<id>
    // If staff → updateReturnStatus(id, 'cancelled')
    const role = user?.role || "staff";
    if (role === "admin") {
      return deleteReturn(returnId);
    } else {
      return updateReturnStatus(returnId, "cancelled");
    }
  };

  const addReturn = async () => {
    return { success: false, message: "Use overstock endpoint" };
  };

  const receiveStock = async (data) => {
    try {
      const res = await fetch(`${API_URL}/inventory/receive`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        await Promise.all([fetchStock(), fetchProducts()]);
        return { success: true, message: json.message };
      }
      return { success: false, message: json.message || "Failed" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const bulkReceiveStock = async (rows) => {
    try {
      const res = await fetch(`${API_URL}/inventory/bulk-receive`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(rows),
      });
      const json = await res.json();
      if (json.success) {
        await Promise.all([fetchStock(), fetchProducts()]);
        return {
          success: true,
          imported: json.imported,
          failed: json.failed,
          errors: json.errors || [],
        };
      }
      return { success: false, message: json.message || "Failed" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const toggleStockStatus = async (refNo, targetStatus) => {
    try {
      const res = await fetch(`${API_URL}/inventory/${encodeURIComponent(refNo)}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStock();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || "Failed to update status" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const updateStockQuantity = async (refNo, newQuantity, reason) => {
    try {
      const res = await fetch(`${API_URL}/inventory/${encodeURIComponent(refNo)}/quantity`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ new_quantity: Number(newQuantity), reason }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStock();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Update failed" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const updateLotQuantity = async (lotId, newQuantity, reason) => {
    try {
      const res = await fetch(`${API_URL}/inventory/lot/${encodeURIComponent(lotId)}/quantity`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ new_quantity: Number(newQuantity), reason }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStock();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Update failed" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const updateStockItem = async (refNo, updates) => {
    try {
      const res = await fetch(`${API_URL}/inventory/${encodeURIComponent(refNo)}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        await fetchStock();
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Update failed" };
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  // ---------- PRODUCT CATALOG METHODS ----------

  const createProduct = async (payload) => {
    try {
      const res = await fetch(`${API_URL}/inventory/products`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchProducts()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Failed to create product" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  const updateProduct = async (refNo, payload) => {
    try {
      const res = await fetch(`${API_URL}/inventory/products/${encodeURIComponent(refNo)}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchProducts()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Failed to update product" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  const bulkCreateProducts = async (rows) => {
    try {
      const res = await fetch(`${API_URL}/inventory/products/bulk`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(rows),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchProducts()]);
        return { success: true, imported: data.imported, failed: data.failed, errors: data.errors || [] };
      }
      return { success: false, message: data.message || "Bulk create failed" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  const issueBulkUnits = async ({ studentId, refNo, lotId, quantity, issueDate }) => {
    try {
      const res = await fetch(`${API_URL}/issued/bulk`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          student_id: studentId,
          ref_no: refNo,
          lot_id: lotId,
          quantity,
          issue_date: issueDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchStock(), fetchIssues()]);
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || "Bulk issue failed" };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ---------- CONTEXT VALUE ----------

  const value = {
    products,
    fetchProducts,
    stock,
    failed,
    issues,
    issuedItems: issues,
    returns,
    loading,
    fetchStock,
    fetchFailed,
    fetchIssues,
    fetchReturns,
    loadAllData,
    getLotsForRef,
    getReturnedUnitsForRef,
    getUnitHistory,
    issueFreshUnit,
    issueBulkUnits,
    issueReturnedUnit,
    issueItem: issueFreshUnit,
    returnUnit,
    returnIssuedItem: returnUnit,
    condemnUnit,
    condemnIssuedItem: condemnUnit,
    exchangeWithVendor,
    markUsedInPatient,
    moveToFailed,
    restoreFailed,
    disposeFailed,
    completeVendorReturn,
    sendOverstockToVendor,
    deleteReturn,
    updateReturnStatus,
    discardReturn,
    addReturn,
    receiveStock,
    bulkReceiveStock,
    toggleStockStatus,
    updateStockQuantity,
    updateLotQuantity,
    updateStockItem,
    createProduct,
    updateProduct,
    bulkCreateProducts,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within an InventoryProvider");
  return ctx;
}
