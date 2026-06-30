import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "../../../styles/chartTheme";
import { formatCurrency } from "../../../utils/format";

type RankDatum = {
  name: string;
  amount: number;
  count?: number;
  share?: number;
  id?: string;
};

type Props = {
  data: RankDatum[];
  onSelect?: (item: RankDatum) => void;
  height?: number;
};

export function BarRankChart({ data, onSelect, height }: Props) {
  if (data.length === 0) return <p className="empty-text">该区间暂无分类数据。</p>;
  const chartHeight = height ?? Math.max(190, data.length * 38 + 44);

  return (
    <div className="chart-frame" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={CHART.line} horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: CHART.muted, fontFamily: CHART.fontFamily, fontSize: 12 }} />
          <YAxis
            dataKey="name"
            type="category"
            width={82}
            axisLine={false}
            tickLine={false}
            tick={{ fill: CHART.muted, fontFamily: CHART.fontFamily, fontSize: 12 }}
          />
          <Tooltip content={<RankTooltip />} />
          <Bar dataKey="amount" name="金额" radius={[0, 6, 6, 0]} isAnimationActive={false} onClick={(item) => onSelect?.(item.payload)}>
            {data.map((item, index) => (
              <Cell key={item.id ?? item.name} fill={CHART.categorical[index % CHART.categorical.length]} cursor={onSelect ? "pointer" : "default"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RankTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RankDatum; color?: string }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{item.name}</strong>
      <span style={{ color: payload[0].color }}>{formatCurrency(item.amount)}</span>
      {typeof item.count === "number" && <span>{item.count} 笔</span>}
      {typeof item.share === "number" && <span>{item.share}%</span>}
    </div>
  );
}
