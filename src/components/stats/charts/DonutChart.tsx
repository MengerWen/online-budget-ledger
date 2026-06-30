import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART } from "../../../styles/chartTheme";
import { formatCurrency } from "../../../utils/format";

type DonutDatum = {
  name: string;
  value: number;
};

type Props = {
  data: DonutDatum[];
  centerLabel: string;
  centerValue: number;
  height?: number;
};

export function DonutChart({ data, centerLabel, centerValue, height = 240 }: Props) {
  const visibleData = data.filter((item) => item.value > 0);
  if (visibleData.length === 0) return <p className="empty-text">该区间还没有记账数据。</p>;

  return (
    <div className="donut-wrap" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={visibleData}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="82%"
            paddingAngle={2}
            stroke={CHART.panel}
            strokeWidth={2}
            isAnimationActive={false}
          >
            {visibleData.map((item, index) => (
              <Cell key={item.name} fill={CHART.categorical[index % CHART.categorical.length]} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <span>{centerLabel}</span>
        <strong>{formatCurrency(centerValue)}</strong>
      </div>
      <div className="chart-legend">
        {visibleData.map((item, index) => (
          <span key={item.name}>
            <i style={{ background: CHART.categorical[index % CHART.categorical.length] }} />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="chart-tooltip">
      <strong>{item.name}</strong>
      <span style={{ color: item.color }}>{formatCurrency(item.value ?? 0)}</span>
    </div>
  );
}
