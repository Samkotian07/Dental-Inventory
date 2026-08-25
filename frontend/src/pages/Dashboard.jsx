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
import "./Dashboard.css";

const CATEGORY_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1"];

const monthlyTrends = [
  { month: "Jan", issued: 12, returned: 8 },
  { month: "Feb", issued: 15, returned: 10 },
  { month: "Mar", issued: 18, returned: 12 },
  { month: "Apr", issued: 22, returned: 14 },
  { month: "May", issued: 25, returned: 16 },
  { month: "Jun", issued: 28, returned: 18 },
];

export default function Dashboard() {
  const onMenuClick = useMenuClick();
  const { stock = [], failed = [], issuedItems = [] } = useInventory();
  const [activeCategory, setActiveCategory] = useState("All Categories");

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
        <StatCards stats={stats} />

        <div className="dashboard__grid">
          <div className="dashboard__col">
            <InventoryTable
              items={stock}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />

            <div className="dashboard__row">
              <CategoryDonut
                data={categoryDistribution}
                activeCategory={activeCategory}
                onSelect={setActiveCategory}
              />
              <MonthlyTrendsChart data={monthlyTrends} />
            </div>
          </div>

          <div className="dashboard__col dashboard__col--side">
            <DashboardCalendar />
            <LowStockAlerts alerts={lowStockAlerts} />
          </div>
        </div>
      </main>
    </>
  );
}
