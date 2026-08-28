import { TriangleAlert } from "lucide-react";
import "./LowStockAlerts.css";

export default function LowStockAlerts({ alerts }) {
  const alertItems = (isCopy = false) => (
    <ul className="alerts-card__list">
      {alerts.map((a) => {
        const severe = a.left <= 3;
        return (
          <li key={`${isCopy ? "copy-" : ""}${a.id}`} className={severe ? "is-severe" : ""}>
            <p>{a.product}</p>
            <span>{a.id}</span>
            <span className="alerts-card__pill">{a.left} left</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className="card alerts-card alerts-card--marquee">
      <div className="alerts-card__head">
        <TriangleAlert size={16} strokeWidth={2.2} />
        <h2>Low Stock Alerts</h2>
      </div>

      {alerts.length === 0 && <p className="alerts-card__empty">Everything is well stocked.</p>}

      {alerts.length > 0 && (
        <div className="alerts-card__viewport">
          <div className="alerts-card__track">
            {alertItems()}
            <div aria-hidden="true">{alertItems(true)}</div>
          </div>
        </div>
      )}
    </section>
  );
}
