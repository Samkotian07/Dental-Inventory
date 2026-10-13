import { useRef, useState, useEffect, useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import "./LowStockAlerts.css";

export default function LowStockAlerts({ alerts = [], speed = 50 }) {
  const [duration, setDuration] = useState(20);
  const [minMultiplier, setMinMultiplier] = useState(1);
  const firstListRef = useRef(null);
  const viewportRef = useRef(null);

  // Reset any dynamically boosted multiplier if the alerts list itself changes
  useEffect(() => {
    setMinMultiplier(1);
  }, [alerts]);

  // Ensure enough items so that the list spans at least 10 items or covers the viewport
  const displayAlerts = useMemo(() => {
    if (!alerts || alerts.length === 0) return [];
    const minItems = 10;
    const baseRepeats = alerts.length < minItems ? Math.ceil(minItems / alerts.length) : 1;
    const totalRepeats = Math.max(baseRepeats, minMultiplier);
    if (totalRepeats > 1) {
      return Array.from({ length: totalRepeats }, () => alerts).flat();
    }
    return alerts;
  }, [alerts, minMultiplier]);

  useEffect(() => {
    if (!firstListRef.current) return;

    const updateMetrics = () => {
      const listWidth = firstListRef.current?.offsetWidth || 0;
      const viewportWidth = viewportRef.current?.offsetWidth || 0;

      // If list width is smaller than the viewport, increase repeat multiplier to avoid visual gaps
      if (listWidth > 0 && viewportWidth > 0 && listWidth < viewportWidth) {
        const needed = Math.ceil(viewportWidth / listWidth);
        setMinMultiplier((prev) => Math.max(prev, needed));
      }

      if (listWidth > 0) {
        const gap = 12; // Matches gap in .alerts-card__track
        const distance = listWidth + gap;
        const targetDuration = distance / Math.max(speed, 1);
        setDuration(targetDuration);
      }
    };

    updateMetrics();

    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });

    if (firstListRef.current) resizeObserver.observe(firstListRef.current);
    if (viewportRef.current) resizeObserver.observe(viewportRef.current);

    return () => resizeObserver.disconnect();
  }, [displayAlerts, speed]);

  const alertItems = (isCopy = false, ref = null) => (
    <ul ref={ref} className="alerts-card__list">
      {displayAlerts.map((a, idx) => {
        const severe = a.left <= 3;
        return (
          <li key={`${isCopy ? "copy-" : ""}${a.id}-${idx}`} className={severe ? "is-severe" : ""}>
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
        <div ref={viewportRef} className="alerts-card__viewport">
          <div
            className="alerts-card__track"
            style={{
              "--marquee-duration": `${duration}s`,
              animationDuration: `${duration}s`,
            }}
          >
            {alertItems(false, firstListRef)}
            <div aria-hidden="true">{alertItems(true)}</div>
          </div>
        </div>
      )}
    </section>
  );
}

