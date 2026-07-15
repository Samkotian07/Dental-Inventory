import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import "./NotificationBell.css";

const defaultNotifications = [
  { id: 1, text: "RY102 is low on stock", time: "2h ago" },
  { id: 2, text: "RY108 is low on stock", time: "3h ago" },
  { id: 3, text: "Exchange update from the supplier", time: "5h ago" },
];

export default function NotificationBell({ items: initial = defaultNotifications }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initial);
  const popRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const dismiss = (id) => setItems((prev) => prev.filter((n) => n.id !== id));

  return (
    <div className="notif" ref={popRef}>
      <button className="notif__bell" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        <Bell size={18} strokeWidth={2} />
        {items.length > 0 && <span className="notif__count">{items.length}</span>}
      </button>

      {open && (
        <div className="notif-pop">
          <div className="notif-pop__head">
            <span>Notification</span>
            {items.length > 0 && <span className="notif-pop__badge">{items.length} New</span>}
          </div>

          <div className="notif-pop__list">
            {items.length === 0 && <p className="notif-pop__empty">You're all caught up.</p>}
            {items.map((n) => (
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

          <button className="notif-pop__all">View All Notification</button>
        </div>
      )}
    </div>
  );
}
