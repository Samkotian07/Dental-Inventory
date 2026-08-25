import { createContext, useContext, useMemo, useState, useEffect } from "react";

const InventoryContext = createContext(null);
const API_URL = "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("dental_token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Normalizes stock object so all property aliases exist
function normalizeStock(i) {
  const refNo = i.ref_no || i.refNo || i.id || `INV-${String(Math.floor(Math.random() * 900) + 100)}`;
  const product = i.product_name || i.product || i.productName || "Dental Product";
  const company = i.company_name || i.company || i.companyName || "Vendor";
  const qty = Number(i.quantity ?? i.qty ?? 1);
  const expiry = i.expiry_date || i.expiry || i.expiryDate || "";

  return {
    ...i,
    id: refNo,
    refNo,
    product,
    productName: product,
    company,
    companyName: company,
    category: i.category || "General",
    size: i.size || "Standard",
    lotNo: i.lot_no || i.lotNo || "LOT-2024-001",
    invoiceNo: i.invoice_no || i.invoiceNo || i.invoiceNumber || i.documentNumber || "INV-2024-001",
    qty,
    quantity: qty,
    expiry,
    expiryDate: expiry,
    status: i.status || "active",
  };
}

// Normalizes issued item object so all property aliases exist
function normalizeIssued(i, index = 0) {
  const issueId = i.id || i.issue_id || i.issueId || `ISS-${String(index + 1).padStart(3, "0")}`;
  const student = i.student_name || i.student || i.studentName || "Student";
  const studentId = i.student_id || i.studentId ? String(i.student_id || i.studentId) : "STU-1000";
  const product = i.product_name || i.product || i.productName || i.itemName || "Dental Product";
  const lotNo = i.lot_no || i.lotNo || "LOT-2024-001";
  const refNo = i.ref_no || i.refNo || "INV-001";
  const qty = Number(i.quantity ?? i.qty ?? 1);
  const date = i.issued_date || i.date || i.issuedDate || i.issueDate || todayISO();
  const returnDate = i.return_date || i.returnDate || null;
  const rawStatus = String(i.status || "Active");
  const status = rawStatus.toLowerCase() === "returned" ? "Returned" : "Active";

  return {
    ...i,
    id: issueId,
    issueId,
    student,
    studentName: student,
    studentId,
    product,
    productName: product,
    itemName: product,
    lotNo,
    refNo,
    qty,
    quantity: qty,
    date,
    issuedDate: date,
    issueDate: date,
    returnDate,
    status,
  };
}

// Normalizes return / exchange item object so all property aliases exist
function normalizeReturn(i, index = 0) {
  const returnId =
    i.id || i.return_id || i.returnId || i.exchange_id || i.exchangeId || (typeof i.id === "string" ? i.id : `RET-${String(index + 1).padStart(3, "0")}`);
  const rawType = String(i.type || (i.exchange_id || i.exchangeId ? "exchange" : "return")).toLowerCase();
  const type = rawType.includes("exchange") ? "exchange" : "return";
  const refNo = i.ref_no || i.refNo || "INV-001";
  const productName = i.product_name || i.productName || i.product || i.itemName || i.reason || "Dental Product";
  const batchNo = i.old_batch_no || i.batchNo || i.oldBatchNo || i.lot_no || i.lotNo || "LOT-2024-001";
  const newBatchNo = i.new_batch_no || i.newBatchNo || "";
  const quantity = Number(i.quantity ?? i.qty ?? 1);
  const reason = i.reason || "Return request";
  const returnDate = i.return_date || i.returnDate || i.date || i.requestDate || i.exchangeDate || todayISO();
  const creditNote = i.credit_note || i.creditNote || i.creditNo || i.creditNumber || "";

  let status = i.status || "Pending";
  if (status.toLowerCase() === "pending") status = "Pending";
  else if (status.toLowerCase() === "completed") status = "Completed";
  else if (status.toLowerCase() === "in progress" || status.toLowerCase() === "in_progress") status = "In Progress";
  else if (status.toLowerCase() === "rejected") status = "Rejected";

  return {
    ...i,
    id: returnId,
    returnId,
    exchangeId: returnId,
    type,
    refNo,
    productName,
    product: productName,
    itemName: productName,
    batchNo,
    oldBatchNo: batchNo,
    newBatchNo,
    quantity,
    qty: quantity,
    reason,
    returnDate,
    date: returnDate,
    creditNote,
    creditNo: creditNote,
    status,
  };
}

// Normalizes failed inventory object so all property aliases exist
function normalizeFailed(item, index = 0) {
  const refNo = item.ref_no || item.refNo || item.id || `FAIL-${String(index + 1).padStart(3, "0")}`;
  const product = item.product_name || item.product || item.productName || "Dental Product";
  const category = item.category || "General";
  const company = item.company_name || item.company || item.companyName || "Vendor";
  const lotNo = item.lot_no || item.lotNo || "LOT-2024-001";
  const qty = Number(item.quantity ?? item.qty ?? 1);
  const failedDate = item.failed_date || item.failedDate || todayISO();
  const reason = item.failure_reason || item.reason || "Failed inspection";
  const status = item.status || "failed";

  return {
    ...item,
    id: refNo,
    refNo,
    product,
    productName: product,
    category,
    company,
    companyName: company,
    lotNo,
    qty,
    quantity: qty,
    failedDate,
    reason,
    status,
  };
}

export function InventoryProvider({ children }) {
  const [stock, setStock] = useState([]);
  const [failed, setFailed] = useState([]);
  const [issuedItems, setIssuedItems] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch functions for individual resources
  const fetchStock = async () => {
    try {
      const res = await fetch(`${API_URL}/inventory/`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        const normalized = data.data.map(normalizeStock);
        setStock(normalized);
        return normalized;
      }
    } catch (err) {
      console.error("Error fetching stock:", err);
    }
  };

  const fetchFailed = async () => {
    try {
      const res = await fetch(`${API_URL}/failed-inventory/`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        const normalized = data.data.map(normalizeFailed);
        setFailed(normalized);
        return normalized;
      }
    } catch (err) {
      console.error("Error fetching failed inventory:", err);
    }
  };

  const fetchIssued = async () => {
    try {
      const res = await fetch(`${API_URL}/issued/`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        const normalized = data.data.map(normalizeIssued);
        setIssuedItems(normalized);
        return normalized;
      }
    } catch (err) {
      console.error("Error fetching issued items:", err);
    }
  };

  const fetchReturns = async () => {
    try {
      const res = await fetch(`${API_URL}/returns/`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        const normalized = data.data.map(normalizeReturn);
        setReturns(normalized);
        return normalized;
      }
    } catch (err) {
      console.error("Error fetching returns:", err);
    }
  };

  // Fetch all inventory data from backend APIs
  useEffect(() => {
    const fetchInventoryData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchStock(),
          fetchFailed(),
          fetchIssued(),
          fetchReturns(),
        ]);
      } catch (error) {
        console.error("Error fetching inventory data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

  // ---- Stock Operations ----
  const addStockItem = async (newItem) => {
    try {
      const payload = {
        product_name: newItem.product || newItem.productName,
        category: newItem.category,
        company_name: newItem.company || newItem.companyName,
        size: newItem.size,
        lot_no: newItem.lotNo,
        quantity: newItem.qty || newItem.quantity,
        expiry_date: newItem.expiry || newItem.expiryDate,
        invoice_no: newItem.invoiceNo,
        ref_no: newItem.refNo,
      };

      const response = await fetch(`${API_URL}/inventory/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const normalized = normalizeStock(data.data);
        setStock((prev) => {
          const existingIdx = prev.findIndex((i) => i.refNo === normalized.refNo);
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = normalized;
            return updated;
          }
          return [normalized, ...prev];
        });
        return { success: true, data: normalized };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error adding stock item:", error);
      return { success: false, message: "Network error" };
    }
  };

  const updateStockItem = async (refNo, patch) => {
    try {
      const item = stock.find((i) => i.refNo === refNo || i.id === refNo);
      if (!item) return;

      const payload = {
        product_name: patch.product || patch.productName || item.product,
        category: patch.category || item.category,
        company_name: patch.company || patch.companyName || item.company,
        size: patch.size || item.size,
        lot_no: patch.lotNo || item.lotNo,
        quantity: patch.qty !== undefined ? patch.qty : patch.quantity || item.qty,
        expiry_date: patch.expiry || patch.expiryDate || item.expiry,
        status: patch.status || item.status,
      };

      const response = await fetch(`${API_URL}/inventory/${item.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const normalized = normalizeStock(data.data);
        setStock((prev) =>
          prev.map((i) => (i.refNo === refNo || i.id === refNo ? normalized : i))
        );
        return { success: true, data: normalized };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error updating stock item:", error);
      return { success: false, message: "Network error" };
    }
  };

  const toggleStockStatus = async (refNo) => {
    try {
      const item = stock.find((i) => i.refNo === refNo || i.id === refNo);
      if (!item) return;

      const response = await fetch(`${API_URL}/inventory/${item.id}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const normalized = normalizeStock(data.data);
        setStock((prev) =>
          prev.map((i) => (i.refNo === refNo || i.id === refNo ? normalized : i))
        );
        return { success: true, data: normalized };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error toggling stock status:", error);
      return { success: false, message: "Network error" };
    }
  };

  const deleteStockItem = async (refNo, { reason, moveToFailed } = {}) => {
    try {
      const item = stock.find((i) => i.refNo === refNo || i.id === refNo);
      const targetId = item ? item.id : refNo;

      const response = await fetch(`${API_URL}/inventory/${targetId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setStock((prev) => prev.filter((i) => i.refNo !== refNo && i.id !== refNo));
        return { success: true };
      }
    } catch (error) {
      console.error("Error deleting stock item:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ---- Failed Inventory Operations ----
  const moveToFailed = async ({ inventoryId, reason, quantity }) => {
    try {
      const response = await fetch(`${API_URL}/failed-inventory/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          inventory_id: inventoryId,
          failure_reason: reason,
          quantity: quantity,
        }),
      });
      const data = await response.json();
      if (data.success && data.data) {
        const normalized = normalizeFailed(data.data);
        setFailed((prev) => [normalized, ...prev]);
        fetchStock();
        return { success: true, data: normalized };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error moving item to failed inventory:", error);
      return { success: false, message: "Network error" };
    }
  };

  const markSentToVendor = async (refNo) => {
    try {
      const item = failed.find((i) => i.refNo === refNo || i.id === refNo);
      if (!item) return;

      const response = await fetch(`${API_URL}/failed-inventory/${item.id}/sent-to-vendor`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const normalized = normalizeFailed(data.data);
        setFailed((prev) =>
          prev.map((i) => (i.refNo === refNo || i.id === refNo ? normalized : i))
        );
        return { success: true, data: normalized };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error marking item as sent to vendor:", error);
      return { success: false, message: "Network error" };
    }
  };

  const restoreFailedToStock = async (refNo) => {
    try {
      const item = failed.find((i) => i.refNo === refNo || i.id === refNo);
      if (!item) return;

      const payload = {
        inventory_data: {
          ref_no: item.refNo,
          product_name: item.product,
          category: item.category || "General",
          company_name: item.company || "Vendor",
          size: item.size || "Standard",
          lot_no: item.lotNo,
          quantity: item.qty,
          expiry_date: item.expiry || todayISO(),
        }
      };

      const response = await fetch(`${API_URL}/failed-inventory/${item.id}/restore`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setFailed((prev) => prev.filter((i) => i.refNo !== refNo && i.id !== refNo));
        fetchStock();
        return { success: true };
      }
    } catch (error) {
      console.error("Error restoring failed item:", error);
      return { success: false, message: "Network error" };
    }
  };

  const markFailedDisposed = async (refNo) => {
    try {
      const item = failed.find((i) => i.refNo === refNo || i.id === refNo);
      if (!item) return;

      const response = await fetch(`${API_URL}/failed-inventory/${item.id}/dispose`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const normalized = normalizeFailed(data.data);
        setFailed((prev) =>
          prev.map((i) => (i.refNo === refNo || i.id === refNo ? normalized : i))
        );
        return { success: true, data: normalized };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error marking item as disposed:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ---- Issued Items Operations ----
  const issueItem = async (issueData) => {
    try {
      const payload = {
        student_id: issueData.studentId,
        inventory_id: issueData.refNo,
        quantity: issueData.qty || issueData.quantity || 1,
      };

      const response = await fetch(`${API_URL}/issued/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const normalized = normalizeIssued(data.data);
        setIssuedItems((prev) => [normalized, ...prev]);
        fetchStock();
        return { success: true, data: normalized };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error issuing item:", error);
      return { success: false, message: "Network error" };
    }
  };

  const returnIssuedItem = async (issueId) => {
    try {
      const target = issuedItems.find((i) => i.issueId === issueId || i.id === issueId);
      if (!target) return;

      const response = await fetch(`${API_URL}/issued/${issueId}/return`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ return_condition: "Good" }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const normalized = normalizeIssued(data.data);
        setIssuedItems((prev) =>
          prev.map((i) => (i.issueId === issueId || i.id === issueId ? normalized : i))
        );
        fetchStock();
        return { success: true, data: normalized };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error returning issued item:", error);
      return { success: false, message: "Network error" };
    }
  };

  const discardIssuedItem = async (issueId) => {
    try {
      const response = await fetch(`${API_URL}/issued/${issueId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setIssuedItems((prev) => prev.filter((i) => i.issueId !== issueId && i.id !== issueId));
        return { success: true };
      }
    } catch (error) {
      console.error("Error discarding issued item:", error);
      return { success: false, message: "Network error" };
    }
  };

  // ---- Track Returns Operations ----
  const addReturn = async (returnItem) => {
    try {
      const payload = {
        type: returnItem.type === "return" ? "creditNote" : returnItem.type || "exchange",
        inventory_id: returnItem.refNo,
        reason: returnItem.reason,
        quantity: returnItem.quantity || returnItem.qty || 1,
        new_batch_no: returnItem.newBatchNo || "",
        credit_note: returnItem.creditNote || "",
        return_date: returnItem.returnDate || todayISO(),
      };

      const response = await fetch(`${API_URL}/returns/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const normalized = normalizeReturn(data.data);
        setReturns((prev) => [normalized, ...prev]);
        return { success: true, data: normalized };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error adding return:", error);
      return { success: false, message: "Network error" };
    }
  };

  const updateReturnStatus = async (returnId, newStatus, extraData = {}) => {
    try {
      const { creditNote, newBatchNo } =
        typeof extraData === "string"
          ? { creditNote: extraData }
          : extraData || {};

      const payload = {
        status: newStatus.toLowerCase().replace(/\s+/g, "_"),
        ...(creditNote && { credit_note: creditNote }),
        ...(newBatchNo && { new_batch_no: newBatchNo }),
      };

      const response = await fetch(`${API_URL}/returns/${returnId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const normalized = normalizeReturn(data.data);
        setReturns((prev) =>
          prev.map((r) =>
            r.returnId === returnId || r.id === returnId ? normalized : r
          )
        );
        return { success: true, data: normalized };
      }
      return { success: false, message: data.error?.message };
    } catch (error) {
      console.error("Error updating return status:", error);
      return { success: false, message: "Network error" };
    }
  };

  const discardReturn = async (returnId) => {
    try {
      const response = await fetch(`${API_URL}/returns/${returnId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setReturns((prev) => prev.filter((r) => r.returnId !== returnId && r.id !== returnId));
        return { success: true };
      }
    } catch (error) {
      console.error("Error discarding return:", error);
      return { success: false, message: "Network error" };
    }
  };

  const value = useMemo(
    () => ({
      // Stock
      stock,
      fetchStock,
      addStock: addStockItem,
      addStockItem,
      updateStock: updateStockItem,
      updateStockItem,
      toggleStockStatus,
      deleteStockItem,

      // Failed
      failed,
      fetchFailed,
      moveToFailed,
      markSentToVendor,
      restoreFailedItem: restoreFailedToStock,
      restoreFailedToStock,
      disposeFailedItem: markFailedDisposed,
      markFailedDisposed,

      // Issued
      issuedItems,
      fetchIssued,
      issueItem,
      returnIssuedItem,
      discardIssuedItem,

      // Returns
      returns,
      fetchReturns,
      addReturn,
      updateReturnStatus,
      discardReturn,

      loading,
    }),
    [stock, failed, issuedItems, returns, loading]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return ctx;
}
