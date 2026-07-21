import { createContext, useContext, useMemo, useState } from "react";
import { stockItems as seedStock } from "../data/stockData.js";
import { failedInventoryItems as seedFailed } from "../data/failedInventoryData.js";

const InventoryContext = createContext(null);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function InventoryProvider({ children }) {
  const [stock, setStock] = useState(seedStock);
  const [failed, setFailed] = useState(seedFailed);

  // ---- Stock ----
  const updateStockItem = (refNo, patch) => {
    setStock((prev) => prev.map((i) => (i.refNo === refNo ? { ...i, ...patch } : i)));
  };

  // Delete from Stock, and either drop it entirely or move it into Failed Inventory
  const deleteStockItem = (refNo, { reason, moveToFailed }) => {
    const item = stock.find((i) => i.refNo === refNo);
    setStock((prev) => prev.filter((i) => i.refNo !== refNo));
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
          reason,
          status: "failed",
        },
        ...prev,
      ]);
    }
  };

  // ---- Failed Inventory ----
  const restoreFailedToStock = (refNo) => {
    const item = failed.find((i) => i.refNo === refNo);
    setFailed((prev) => prev.filter((i) => i.refNo !== refNo));
    if (item) {
      setStock((prev) => [
        {
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
        },
        ...prev,
      ]);
    }
  };

  const markFailedDisposed = (refNo) => {
    setFailed((prev) => prev.map((i) => (i.refNo === refNo ? { ...i, status: "disposed" } : i)));
  };

  const value = useMemo(
    () => ({
      stock,
      updateStockItem,
      deleteStockItem,

      failed,
      restoreFailedToStock,
      markFailedDisposed,
    }),
    [stock, failed]
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
