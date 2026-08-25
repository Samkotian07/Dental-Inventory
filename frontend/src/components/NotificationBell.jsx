import { useEffect, useRef, useState, useMemo } from "react";
import { Bell, X } from "lucide-react";
import { useInventory } from "../context/InventoryContext.jsx";
import "./NotificationBell.css";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { stock = [], failed = [], returns = [] } = useInventory();
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const popRef = useRef(null);

  const notifications = useMemo(() => {
    const list = [];

    // Low stock notifications
    stock.forEach((item) => {
      const qty = Number(item.qty ?? item.quantity ?? 0);
      if (qty <= 10) {
        list.push({
          id: `low-${item.refNo || item.id}`,
          text: `${item.product || item.productName || "Item"} (${item.refNo || item.id}) is low on stock (${qty} left)`,
          time: "Just now",
        });
      }
    });

    // Failed inventory notifications
    if (failed.length > 0) {
      list.push({
        id: "failed-summary",
        text: `${failed.length} item(s) in failed inventory requiring attention`,
        time: "Today",
      });
    }

    // Pending returns notifications
    const pendingReturns = returns.filter(
      (r) => (r.status || "").toLowerCase() === "pending"
    );
    if (pendingReturns.length > 0) {
      list.push({
        id: "returns-summary",
        text: `${pendingReturns.length} vendor return(s) pending resolution`,
        time: "Today",
      });
    }

    return list.filter((n) => !dismissedIds.has(n.id));
  }, [stock, failed, returns, dismissedIds]);

  useEffect(() => {
    function onClick(e) {
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const dismiss = (id) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  return (
    <div className="notif" ref={popRef}>
      <button className="notif__bell" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        <Bell size={18} strokeWidth={2} />
        {notifications.length > 0 && <span className="notif__count">{notifications.length}</span>}
      </button>

      {open && (
        <div className="notif-pop">
          <div className="notif-pop__head">
            <span>Notifications</span>
            {notifications.length > 0 && <span className="notif-pop__badge">{notifications.length} New</span>}
          </div>

          <div className="notif-pop__list">
            {notifications.length === 0 && <p className="notif-pop__empty">You're all caught up.</p>}
            {notifications.map((n) => (
              <div className="notif-pop__item" key={n.id}>
                <div>
                  <p>{n.text}</p>
                  <span>{n.time}</span>
                </div>
                <button onClick={() => dismiss(n.id)} aria-label="Dismiss">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
