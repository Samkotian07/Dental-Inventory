import { useState, useMemo } from "react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import StatCards from "../components/dashboard/StatCards.jsx";
import InventoryTable from "../components/dashboard/InventoryTable.jsx";
import DashboardCalendar from "../components/dashboard/DashboardCalendar.jsx";
import LowStockAlerts from "../components/dashboard/LowStockAlerts.jsx";
import CategoryDonut from "../components/dashboard/CategoryDonut.jsx";
import MonthlyTrendsChart from "../components/dashboard/MonthlyTrendsChart.jsx";
import { useMenuClick } from "../components/Layout.jsx";
import { useInventory } from "../context/InventoryContext.jsx";
import "./css/Dashboard.css";

const CATEGORY_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1"];

export default function Dashboard() {
  const onMenuClick = useMenuClick();
  const { stock = [], failed = [], issuedItems = [], returns = [] } = useInventory();
  const [activeCategory, setActiveCategory] = useState("All Categories");

  const monthlyTrends = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString("default", { month: "short" });
      const year = d.getFullYear();
      const monthIndex = d.getMonth();

      let issuedCount = 0;
      issuedItems.forEach((item) => {
        const itemDateStr = item.date || item.issuedDate || item.issueDate;
        if (itemDateStr) {
          const itemDate = new Date(itemDateStr);
          if (!isNaN(itemDate.getTime()) && itemDate.getMonth() === monthIndex && itemDate.getFullYear() === year) {
            issuedCount += Number(item.qty || item.quantity || 1);
          }
        }
      });

      let returnedCount = 0;
      returns.forEach((item) => {
        const returnDateStr = item.returnDate || item.date;
        if (returnDateStr) {
          const returnDate = new Date(returnDateStr);
          if (!isNaN(returnDate.getTime()) && returnDate.getMonth() === monthIndex && returnDate.getFullYear() === year) {
            returnedCount += Number(item.quantity || item.qty || 1);
          }
        }
      });

      months.push({
        month: monthLabel,
        issued: issuedCount,
        returned: returnedCount,
      });
    }

    return months;
  }, [issuedItems, returns]);

  const productsList = useMemo(() => {
    const map = new Map();
    (stock || []).forEach((item) => {
      const key = item.refNo || item.ref_no || item.id;
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          refNo: key,
          product: item.product || item.productName || item.product_name || "Product",
          productName: item.product || item.productName || item.product_name || "Product",
          company: item.company || item.companyName || item.company_name || "Vendor",
          category: item.category || "General",
          size: item.size || "Standard",
          lowStockThreshold: item.lowStockThreshold ?? item.low_stock_threshold ?? 10,
          totalQty: 0,
        });
      }
      const p = map.get(key);
      p.totalQty += Number(item.quantity ?? item.qty ?? 1);
    });
    return Array.from(map.values());
  }, [stock]);

  const uniqueProductsCount = productsList.length;

  const lowStockProducts = useMemo(() => {
    return productsList.filter((p) => p.totalQty <= p.lowStockThreshold);
  }, [productsList]);

  const uniqueFailedProductsCount = useMemo(() => {
    return new Set((failed || []).map((f) => f.refNo || f.id)).size;
  }, [failed]);

  const stats = useMemo(
    () => [
      { key: "total", label: "Total Products", value: uniqueProductsCount, tone: "blue" },
      { key: "low", label: "Low Stock Products", value: lowStockProducts.length, tone: "amber" },
      { key: "expiring", label: "Failed Products", value: uniqueFailedProductsCount, tone: "red" },
      { key: "issued", label: "Issued Items", value: issuedItems.filter((i) => i.status === "Active").length, tone: "green" },
    ],
    [uniqueProductsCount, lowStockProducts.length, uniqueFailedProductsCount, issuedItems]
  );

  const lowStockAlerts = useMemo(() => {
    return lowStockProducts.map((item) => ({
      id: item.refNo,
      product: item.product,
      left: item.totalQty,
    }));
  }, [lowStockProducts]);

  const categoryDistribution = useMemo(() => {
    const counts = {};
    productsList.forEach((item) => {
      const cat = item.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const keys = Object.keys(counts);
    if (keys.length === 0) {
      return [{ name: "General", value: 0, color: CATEGORY_COLORS[0] }];
    }

    return keys.map((cat, idx) => ({
      name: cat,
      value: counts[cat],
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [productsList]);

  return (
    <>
      <DashboardHeader onMenuClick={onMenuClick} />

      <main className="dashboard">
        <LowStockAlerts alerts={lowStockAlerts} />
        <StatCards stats={stats} />

        <div className="dashboard__grid">
          <div className="dashboard__col">
            <InventoryTable
              items={stock}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
            {/*
            <div className="dashboard__row">
              <CategoryDonut
                data={categoryDistribution}
                activeCategory={activeCategory}
                onSelect={setActiveCategory}
              />
              <MonthlyTrendsChart data={monthlyTrends} />
            </div>*/}
          </div>

          <div className="dashboard__col dashboard__col--side">
            <DashboardCalendar
              stock={stock}
              issuedItems={issuedItems}
              returns={returns}
              failed={failed}
            />
          </div>
        </div>
      </main>
    </>
  );
}
