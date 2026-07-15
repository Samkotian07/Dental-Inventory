import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import "./CategoryDonut.css";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="donut-tip">
      <strong>{name}</strong>
      <span>{value} products</span>
    </div>
  );
}

export default function CategoryDonut({ data, activeCategory, onSelect }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <section className="card donut-card">
      <div className="card__head">
        <h2>Category Distribution</h2>
      </div>

      <div className="donut-card__body">
        <div className="donut-card__chart">
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={3}
                stroke="#fff"
                strokeWidth={2}
                onClick={(entry) =>
                  onSelect(activeCategory === entry.name ? "All Categories" : entry.name)
                }
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    cursor="pointer"
                    opacity={activeCategory === "All Categories" || activeCategory === entry.name ? 1 : 0.3}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-card__total">
            <strong>{total}</strong>
            <span>types</span>
          </div>
        </div>

        <ul className="donut-card__legend">
          {data.map((d) => (
            <li key={d.name}>
              <button
                className={activeCategory === d.name ? "is-active" : ""}
                onClick={() => onSelect(activeCategory === d.name ? "All Categories" : d.name)}
              >
                <span className="donut-card__swatch" style={{ background: d.color }} />
                {d.name}
                <span className="donut-card__value">{d.value}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {activeCategory !== "All Categories" && (
        <button className="donut-card__clear" onClick={() => onSelect("All Categories")}>
          Clear filter — showing {activeCategory} in the table
        </button>
      )}
    </section>
  );
}
