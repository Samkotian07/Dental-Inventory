import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PackagePlus, PackageMinus } from "lucide-react";
import "./DashboardCalendar.css";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function dateKey(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : toKey(date);
}

export default function DashboardCalendar({ stock = [], issuedItems = [], returns = [], failed = [] }) {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);

  const dailyActivity = useMemo(() => {
    const activities = {};
    const add = (date, type, activity) => {
      const key = dateKey(date);
      if (!key) return;
      (activities[key] ||= { added: [], issued: [] })[type].push(activity);
    };

    stock.forEach((item) => add(item.createdAt, "added", {
      qty: item.quantity ?? item.qty ?? 0,
      product: item.productName || item.product || "Inventory item",
      company: item.companyName || item.company || "Vendor",
      id: item.refNo || item.id || "",
      verb: "added",
    }));
    issuedItems.forEach((item) => add(item.issueDate || item.date, "issued", {
      qty: item.quantity ?? item.qty ?? 1,
      product: item.productName || item.product || "Inventory item",
      to: item.studentName || item.student || "Student",
      id: item.issueId || item.id || "",
      verb: "issued",
    }));
    returns.forEach((item) => add(item.returnDate, "issued", {
      qty: item.quantity ?? item.qty ?? 1,
      product: item.productName || item.product || "Inventory item",
      to: "Vendor return",
      id: item.returnId || item.id || "",
      verb: "returned",
    }));
    failed.forEach((item) => add(item.createdAt, "issued", {
      qty: item.quantity ?? item.qty ?? 1,
      product: item.productName || item.product || "Inventory item",
      to: item.reason || "Failed inventory",
      id: item.refNo || item.id || "",
      verb: "moved to failed inventory",
    }));
    return activities;
  }, [stock, issuedItems, returns, failed]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const changeMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    setCursor(next);
  };

  const selectedKey = toKey(selected);
  const activity = dailyActivity[selectedKey];
  const isSameDay = (a, b) =>
    a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <section className="card cal-card">
      <div className="cal__head">
        <h2>{MONTH_NAMES[month]} {year}</h2>
        <div className="cal__nav">
          <button onClick={() => changeMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => changeMonth(1)} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="cal__grid cal__grid--head">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className="cal__grid">
        {cells.map((date, i) => {
          if (!date) return <span key={i} className="cal__cell cal__cell--empty" />;
          const key = toKey(date);
          const hasActivity = Boolean(dailyActivity[key]);
          const isSelected = isSameDay(date, selected);
          const isToday = isSameDay(date, today);
          return (
            <button
              key={i}
              className={`cal__cell ${isSelected ? "is-selected" : ""} ${isToday && !isSelected ? "is-today" : ""}`}
              onClick={() => setSelected(date)}
            >
              {date.getDate()}
              {hasActivity && !isSelected && <span className="cal__dot" />}
            </button>
          );
        })}
      </div>

      <div className="cal__detail">
        <p className="cal__detail-date">
          {selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>

        {!activity && <p className="cal__detail-empty">No stock activity logged for this date.</p>}

        {activity && (
          <div className="cal__detail-list">
            {activity.added.map((item, i) => (
              <div className="cal__detail-row" key={`a-${i}`}>
                <span className="cal__detail-icon cal__detail-icon--add">
                  <PackagePlus size={13} strokeWidth={2.3} />
                </span>
                <div>
                  <p>
                    <strong>{item.qty}</strong> {item.product} {item.verb || "added"}
                  </p>
                  <span>{item.company} · {item.id}</span>
                </div>
              </div>
            ))}
            {activity.issued.map((item, i) => (
              <div className="cal__detail-row" key={`i-${i}`}>
                <span className="cal__detail-icon cal__detail-icon--issue">
                  <PackageMinus size={13} strokeWidth={2.3} />
                </span>
                <div>
                  <p>
                    <strong>{item.qty}</strong> {item.product} {item.verb || "issued"}
                  </p>
                  <span>{item.to} · {item.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
