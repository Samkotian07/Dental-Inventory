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
      {stats.map((s, idx) => {
        const Icon = iconMap[s.key] || Boxes;
        const key = s.key || s.title || `stat-${idx}`;
        const label = s.label || s.title || "Stat";
        const tone = s.tone || "blue";
        return (
          <article className="stat-card" key={key}>
            <span className={`stat-card__icon stat-card__icon--${tone}`}>
              <Icon size={18} strokeWidth={2.2} />
            </span>
            <strong>{s.value}</strong>
            <span className="stat-card__label">{label}</span>
          </article>
        );
      })}
    </div>
  );
}
