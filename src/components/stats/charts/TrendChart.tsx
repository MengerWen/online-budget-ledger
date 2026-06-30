import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "../../../styles/chartTheme";
import { formatCurrency } from "../../../utils/format";

type SeriesPoint = {
  date: string;
  food?: number;
  extra?: number;
  total?: number;
  amount?: number;
};

type Props = {
  data: SeriesPoint[];
  mode?: "stacked" | "single";
  height?: number;
};

export function TrendChart({ data, mode = "stacked", height = 280 }: Props) {
  if (data.length === 0) return <p className="empty-text">该区间还没有记账数据。</p>;

  const singleSeries = mode === "single";
  const singleDay = data.length <= 1;
  const chartData = data.map((point) => ({
    ...point,
    label: point.date.slice(5)
  }));

  return (
    <div className="chart-frame" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {singleDay ? (
          <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART.line} vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: CHART.muted, fontFamily: CHART.fontFamily, fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => String(value)} tick={{ fill: CHART.muted, fontFamily: CHART.fontFamily, fontSize: 12 }} width={46} />
            <Tooltip content={<ChartTooltip />} />
            {singleSeries ? (
              <Bar dataKey="amount" name="金额" fill={CHART.blue} radius={[6, 6, 0, 0]} isAnimationActive={false} />
            ) : (
              <>
                <Bar dataKey="food" name="三餐" stackId="total" fill={CHART.green} radius={[0, 0, 4, 4]} isAnimationActive={false} />
                <Bar dataKey="extra" name="额外" stackId="total" fill={CHART.orange} radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </>
            )}
          </BarChart>
        ) : (
          <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART.line} vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: CHART.muted, fontFamily: CHART.fontFamily, fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => String(value)} tick={{ fill: CHART.muted, fontFamily: CHART.fontFamily, fontSize: 12 }} width={46} />
            <Tooltip content={<ChartTooltip />} />
            {singleSeries ? (
              <Area type="monotone" dataKey="amount" name="金额" stroke={CHART.blue} fill={CHART.blue} fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} />
            ) : (
              <>
                <Area type="monotone" dataKey="food" name="三餐" stackId="1" stroke={CHART.green} fill={CHART.green} fillOpacity={0.22} strokeWidth={2} isAnimationActive={false} />
                <Area type="monotone" dataKey="extra" name="额外" stackId="1" stroke={CHART.orange} fill={CHART.orange} fillOpacity={0.22} strokeWidth={2} isAnimationActive={false} />
              </>
            )}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.name} style={{ color: item.color }}>
          {item.name}：{formatCurrency(item.value ?? 0)}
        </span>
      ))}
    </div>
  );
}
