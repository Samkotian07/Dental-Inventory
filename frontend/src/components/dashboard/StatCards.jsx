import { Boxes, TriangleAlert, Clock, FileCheck2 } from "lucide-react";
import "./StatCards.css";

const iconMap = {
  total: Boxes,
  low: TriangleAlert,
  expiring: Clock,
  issued: FileCheck2,
};

export default function StatCards({ stats }) {
  return (
    <div className="stat-cards">
      {stats.map((s) => {
        const Icon = iconMap[s.key];
        return (
          <article className="stat-card" key={s.key}>
            <span className={`stat-card__icon stat-card__icon--${s.tone}`}>
              <Icon size={18} strokeWidth={2.2} />
            </span>
            <strong>{s.value}</strong>
            <span className="stat-card__label">{s.label}</span>
          </article>
        );
      })}
    </div>
  );
}
