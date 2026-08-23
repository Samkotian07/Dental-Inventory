import { createContext, useContext, useMemo, useState } from "react";
import { stockItems as seedStock } from "../data/stockData.js";
import { failedInventoryItems as seedFailed } from "../data/failedInventoryData.js";
import { issuedItems as seedIssued } from "../data/issuedData.js";
import { returnItems as seedReturns } from "../data/returnData.js";
import {
  mockInventory,
  mockFailedInventory,
  mockIssued,
  mockExchanges,
} from "../components/utils/mockData.js";

const InventoryContext = createContext(null);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Normalizes stock object so all property aliases exist
function normalizeStock(i) {
  const refNo = i.refNo || i.id || `INV-${String(Math.floor(Math.random() * 900) + 100)}`;
  const product = i.product || i.productName || "Dental Product";
  const company = i.company || i.companyName || "Vendor";
  const qty = Number(i.qty ?? i.quantity ?? 1);
  const expiry = i.expiry || i.expiryDate || "";

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
    lotNo: i.lotNo || "LOT-2024-001",
    invoiceNo: i.invoiceNo || i.invoiceNumber || i.documentNumber || "INV-2024-001",
    qty,
    quantity: qty,
    expiry,
    expiryDate: expiry,
    status: i.status || "active",
  };
}

// Normalizes issued item object so all property aliases exist
function normalizeIssued(i, index = 0) {
  const issueId = i.issueId || i.id || `ISS-${String(index + 1).padStart(3, "0")}`;
  const student = i.student || i.studentName || "Student";
  const studentId = i.studentId ? String(i.studentId) : "STU-1000";
  const product = i.product || i.productName || i.itemName || "Dental Product";
  const lotNo = i.lotNo || "LOT-2024-001";
  const refNo = i.refNo || "INV-001";
  const qty = Number(i.qty ?? i.quantity ?? 1);
  const date = i.date || i.issuedDate || i.issueDate || todayISO();
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
    returnDate: i.returnDate || null,
    status,
  };
}

// Normalizes return / exchange item object so all property aliases exist
function normalizeReturn(i, index = 0) {
  const returnId =
    i.returnId || i.exchangeId || (typeof i.id === "string" ? i.id : `RET-${String(index + 1).padStart(3, "0")}`);
  const rawType = String(i.type || (i.exchangeId ? "exchange" : "return")).toLowerCase();
  const type = rawType.includes("exchange") ? "exchange" : "return";
  const refNo = i.refNo || "INV-001";
  const productName = i.productName || i.product || i.itemName || i.reason || "Dental Product";
  const batchNo = i.batchNo || i.oldBatchNo || i.lotNo || "LOT-2024-001";
  const newBatchNo = i.newBatchNo || "";
  const quantity = Number(i.quantity ?? i.qty ?? 1);
  const reason = i.reason || "Return request";
  const returnDate = i.returnDate || i.date || i.requestDate || i.exchangeDate || todayISO();
  const creditNote = i.creditNote || i.creditNo || i.creditNumber || "";

  let status = i.status || "Pending";
  if (status.toLowerCase() === "pending") status = "Pending";
  else if (status.toLowerCase() === "completed") status = "Completed";
  else if (status.toLowerCase() === "in progress") status = "In Progress";
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

export function InventoryProvider({ children }) {
  // Combine seed items and mock data safely
  const [stock, setStock] = useState(() => {
    const map = new Map();
    [...seedStock, ...mockInventory].forEach((item) => {
      const norm = normalizeStock(item);
      if (!map.has(norm.refNo)) {
        map.set(norm.refNo, norm);
      }
    });
    return Array.from(map.values());
  });

  const [failed, setFailed] = useState(() => {
    const map = new Map();
    [...seedFailed, ...mockFailedInventory].forEach((item) => {
      const refNo = item.refNo || `INV-${item.id}`;
      if (!map.has(refNo)) {
        map.set(refNo, {
          ...item,
          refNo,
          product: item.product || item.productName || "Dental Item",
          qty: item.qty || item.quantity || 1,
          failedDate: item.failedDate || todayISO(),
          reason: item.reason || "Failed inspection",
          status: item.status || "failed",
        });
      }
    });
    return Array.from(map.values());
  });

  const [issuedItems, setIssuedItems] = useState(() => {
    const map = new Map();
    [...seedIssued, ...mockIssued].forEach((item, index) => {
      const norm = normalizeIssued(item, index);
      if (!map.has(norm.issueId)) {
        map.set(norm.issueId, norm);
      }
    });
    return Array.from(map.values());
  });

  const [returns, setReturns] = useState(() => {
    const map = new Map();
    [...seedReturns, ...mockExchanges].forEach((item, index) => {
      const norm = normalizeReturn(item, index);
      if (!map.has(norm.returnId)) {
        map.set(norm.returnId, norm);
      }
    });
    return Array.from(map.values());
  });

  // ---- Stock Operations ----
  const addStockItem = (newItem) => {
    const norm = normalizeStock(newItem);
    setStock((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.refNo.toLowerCase() === norm.refNo.toLowerCase()
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = existing.qty + norm.qty;
        updated[existingIdx] = {
          ...existing,
          ...norm,
          qty: newQty,
          quantity: newQty,
        };
        return updated;
      }
      return [norm, ...prev];
    });
  };

  const updateStockItem = (refNo, patch) => {
    setStock((prev) =>
      prev.map((i) => {
        if (i.refNo === refNo || i.id === refNo) {
          const updated = { ...i, ...patch };
          if (patch.qty !== undefined) updated.quantity = Number(patch.qty);
          if (patch.quantity !== undefined) updated.qty = Number(patch.quantity);
          if (patch.product !== undefined) updated.productName = patch.product;
          if (patch.productName !== undefined) updated.product = patch.productName;
          return updated;
        }
        return i;
      })
    );
  };

  const deleteStockItem = (refNo, { reason, moveToFailed } = {}) => {
    const item = stock.find((i) => i.refNo === refNo || i.id === refNo);
    setStock((prev) => prev.filter((i) => i.refNo !== refNo && i.id !== refNo));
    if (moveToFailed && item) {
      setFailed((prev) => [
        {
          refNo: item.refNo,
          category: item.category,
          company: item.company,
          product: item.product,
          size: item.size,
          lotNo: item.lotNo,
          invoiceNo: item.invoiceNo,
          qty: item.qty,
          failedDate: todayISO(),
          reason: reason || "Damaged/Defective",
          status: "failed",
        },
        ...prev,
      ]);
    }
  };

  // ---- Failed Inventory Operations ----
  const restoreFailedToStock = (refNo) => {
    const item = failed.find((i) => i.refNo === refNo);
    setFailed((prev) => prev.filter((i) => i.refNo !== refNo));
    if (item) {
      addStockItem({
        refNo: item.refNo,
        invoiceNo: item.invoiceNo,
        lotNo: item.lotNo,
        category: item.category,
        company: item.company,
        product: item.product,
        size: item.size,
        qty: item.qty,
        expiry: item.expiry || null,
        created: todayISO(),
      });
    }
  };

  const markFailedDisposed = (refNo) => {
    setFailed((prev) =>
      prev.map((i) => (i.refNo === refNo ? { ...i, status: "disposed" } : i))
    );
  };

  // ---- Issued Items Operations ----
  const issueItem = (issueData) => {
    const issueQty = Number(issueData.qty || issueData.quantity || 1);
    const nextNum = issuedItems.length + 1;
    const rawIssue = {
      issueId: `ISS-${String(nextNum).padStart(3, "0")}`,
      studentId: issueData.studentId || "STU-1000",
      student: issueData.student || issueData.studentName || "Student",
      product: issueData.product || issueData.productName || "Dental Item",
      lotNo: issueData.lotNo || "LOT-2024-001",
      refNo: issueData.refNo || "INV-001",
      qty: issueQty,
      quantity: issueQty,
      date: issueData.date || issueData.issuedDate || todayISO(),
      returnDate: null,
      status: "Active",
    };
    const norm = normalizeIssued(rawIssue, nextNum);

    setIssuedItems((prev) => [norm, ...prev]);

    // Automatically deduct quantity from Stock
    setStock((prev) =>
      prev.map((i) => {
        if (i.refNo === issueData.refNo || i.id === issueData.refNo) {
          const currentQty = i.qty || i.quantity || 0;
          const remaining = Math.max(0, currentQty - issueQty);
          return { ...i, qty: remaining, quantity: remaining };
        }
        return i;
      })
    );
  };

  const returnIssuedItem = (issueId) => {
    const target = issuedItems.find((i) => i.issueId === issueId || i.id === issueId);
    if (!target) return;

    setIssuedItems((prev) =>
      prev.map((i) =>
        i.issueId === issueId || i.id === issueId
          ? {
              ...i,
              status: "Returned",
              returnDate: todayISO(),
            }
          : i
      )
    );

    // Automatically restore quantity back to Stock
    setStock((prev) =>
      prev.map((i) => {
        if (i.refNo === target.refNo || i.id === target.refNo) {
          const currentQty = i.qty || i.quantity || 0;
          const restored = currentQty + Number(target.qty || target.quantity || 1);
          return { ...i, qty: restored, quantity: restored };
        }
        return i;
      })
    );
  };

  const discardIssuedItem = (issueId) => {
    setIssuedItems((prev) => prev.filter((i) => i.issueId !== issueId && i.id !== issueId));
  };

  // ---- Track Returns Operations ----
  const addReturn = (returnItem) => {
    const nextNum = returns.length + 1;
    const rawReturn = {
      returnId: `RET-${String(nextNum).padStart(3, "0")}`,
      status: "Pending",
      creditNote: "",
      newBatchNo: "",
      ...returnItem,
    };
    const norm = normalizeReturn(rawReturn, nextNum);
    setReturns((prev) => [norm, ...prev]);
  };

  const updateReturnStatus = (returnId, newStatus, extraData = {}) => {
    const { creditNote, newBatchNo } = typeof extraData === "string" ? { creditNote: extraData } : (extraData || {});
    setReturns((prev) =>
      prev.map((r) =>
        r.returnId === returnId || r.id === returnId
          ? {
              ...r,
              status: newStatus,
              ...(creditNote !== undefined && creditNote !== "" && { creditNote, creditNo: creditNote }),
              ...(newBatchNo !== undefined && newBatchNo !== "" && { newBatchNo }),
            }
          : r
      )
    );
  };

  const discardReturn = (returnId) => {
    setReturns((prev) => prev.filter((r) => r.returnId !== returnId && r.id !== returnId));
  };

  const value = useMemo(
    () => ({
      stock,
      addStockItem,
      updateStockItem,
      deleteStockItem,

      failed,
      restoreFailedToStock,
      markFailedDisposed,

      issuedItems,
      issueItem,
      returnIssuedItem,
      discardIssuedItem,

      returns,
      addReturn,
      updateReturnStatus,
      discardReturn,
    }),
    [stock, failed, issuedItems, returns]
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
