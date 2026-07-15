import { useState } from "react";
import DashboardHeader from "../components/dashboard/DashboardHeader.jsx";
import StatCards from "../components/dashboard/StatCards.jsx";
import InventoryTable from "../components/dashboard/InventoryTable.jsx";
import DashboardCalendar from "../components/dashboard/DashboardCalendar.jsx";
import LowStockAlerts from "../components/dashboard/LowStockAlerts.jsx";
import CategoryDonut from "../components/dashboard/CategoryDonut.jsx";
import MonthlyTrendsChart from "../components/dashboard/MonthlyTrendsChart.jsx";
import { useMenuClick } from "../components/Layout.jsx";
import { stats, inventory, lowStockAlerts, categoryDistribution, monthlyTrends } from "../data/dashboardData.js";
import "./Dashboard.css";

export default function Dashboard() {
  const onMenuClick = useMenuClick();
  const [activeCategory, setActiveCategory] = useState("All Categories");

  return (
    <>
      <DashboardHeader onMenuClick={onMenuClick} />

      <main className="dashboard">
        <StatCards stats={stats} />

        <div className="dashboard__grid">
          <div className="dashboard__col">
            <InventoryTable
              items={inventory}
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
