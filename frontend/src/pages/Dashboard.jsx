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

  const totalItemsCount = useMemo(() => {
    return stock.reduce((sum, item) => sum + Number(item.qty || item.quantity || 0), 0);
  }, [stock]);

  const lowStockItems = useMemo(() => {
    return stock.filter((item) => Number(item.qty || item.quantity || 0) <= 10);
  }, [stock]);

  const stats = useMemo(
    () => [
      { key: "total", label: "Total Items", value: totalItemsCount, tone: "blue" },
      { key: "low", label: "Low Stock", value: lowStockItems.length, tone: "amber" },
      { key: "expiring", label: "Failed Items", value: failed.length, tone: "red" },
      { key: "issued", label: "Issued Items", value: issuedItems.filter((i) => i.status === "Active").length, tone: "green" },
    ],
    [totalItemsCount, lowStockItems.length, failed.length, issuedItems]
  );

  const lowStockAlerts = useMemo(() => {
    return lowStockItems.map((item) => ({
      id: item.refNo || item.id,
      product: item.product || item.productName || "Dental Item",
      left: Number(item.qty || item.quantity || 0),
    }));
  }, [lowStockItems]);

  const categoryDistribution = useMemo(() => {
    const counts = {};
    stock.forEach((item) => {
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
  }, [stock]);

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
            />{/*
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
