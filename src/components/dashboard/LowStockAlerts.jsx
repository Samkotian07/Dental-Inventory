import { TriangleAlert } from "lucide-react";
import "./LowStockAlerts.css";

export default function LowStockAlerts({ alerts }) {
  return (
    <section className="card alerts-card">
      <div className="alerts-card__head">
        <TriangleAlert size={16} strokeWidth={2.2} />
        <h2>Low Stock Alerts</h2>
      </div>

      {alerts.length === 0 && <p className="alerts-card__empty">Everything is well stocked.</p>}

      <ul className="alerts-card__list">
        {alerts.map((a) => {
          const severe = a.left <= 3;
          return (
            <li key={a.id} className={severe ? "is-severe" : ""}>
              <div>
                <p>{a.product}</p>
                <span>{a.id}</span>
              </div>
              <span className="alerts-card__pill">{a.left} left</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
