import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import "./MonthlyTrendsChart.css";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const added = payload.find((p) => p.dataKey === "added")?.value ?? 0;
  const issued = payload.find((p) => p.dataKey === "issued")?.value ?? 0;
  return (
    <div className="trend-tip">
      <strong>{label}</strong>
      <span>
        <i className="dot dot--add" /> added : {added}
      </span>
      <span>
        <i className="dot dot--issue" /> issued : {issued}
      </span>
    </div>
  );
}

export default function MonthlyTrendsChart({ data }) {
  const [focusMonth, setFocusMonth] = useState(null);
  const active = focusMonth ? data.find((d) => d.month === focusMonth) : null;

  return (
    <section className="card trend-card">
      <div className="card__head">
        <h2>Monthly Trends</h2>
        {active && (
          <span className="trend-card__summary">
            {active.month}: <strong>{active.added}</strong> added · <strong>{active.issued}</strong> issued
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          barGap={3}
          onClick={(state) => {
            const label = state?.activeLabel;
            if (label) setFocusMonth(label === focusMonth ? null : label);
          }}
        >
          <CartesianGrid vertical={false} stroke="#E4E4E4" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6B6E76" }}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#6B6E76" }} width={26} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(20,20,22,0.06)" }} />
          <Bar dataKey="added" fill="#141416" radius={[3, 3, 0, 0]} maxBarSize={10} cursor="pointer" />
          <Bar dataKey="issued" fill="#B7B9BD" radius={[3, 3, 0, 0]} maxBarSize={10} cursor="pointer" />
        </BarChart>
      </ResponsiveContainer>

      <div className="trend-card__legend">
        <span><i className="dot dot--add" /> added</span>
        <span><i className="dot dot--issue" /> issued</span>
      </div>
    </section>
  );
}
