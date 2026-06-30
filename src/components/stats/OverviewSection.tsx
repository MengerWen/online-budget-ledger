import type { MealKey } from "../../types";
import { formatCurrency } from "../../utils/format";
import type { DailyStatsPoint, MealBreakdownItem, RangeSummary } from "../../utils/stats";
import { DonutChart } from "./charts/DonutChart";
import { TrendChart } from "./charts/TrendChart";

type Props = {
  summary: RangeSummary;
  series: DailyStatsPoint[];
  meals: MealBreakdownItem[];
  onFocusExtra: () => void;
  onSelectMeal: (meal: MealKey) => void;
};

export function OverviewSection({ summary, series, meals, onFocusExtra, onSelectMeal }: Props) {
  const hasData = summary.total > 0 || summary.entryCount > 0;

  return (
    <section className="stats-overview">
      <div className="stats-kpi-grid">
        <Kpi label="总支出" value={formatCurrency(summary.total)} />
        <Kpi label="日均" value={formatCurrency(summary.dailyAverage)} />
        <Kpi label="三餐合计" value={formatCurrency(summary.foodTotal)} />
        <Kpi label="额外花销" value={formatCurrency(summary.extraTotal)} onClick={onFocusExtra} />
        <Kpi label="记账笔数" value={`${summary.entryCount} 笔`} />
        <Kpi label="有记录天数" value={`${summary.recordedDays} 天`} />
      </div>

      {!hasData ? (
        <section className="section-block">
          <p className="empty-text">该区间还没有记账数据。</p>
        </section>
      ) : (
        <>
          <section className="section-block">
            <div className="section-title">
              <div>
                <p className="eyebrow">趋势</p>
                <h2>每日支出</h2>
              </div>
              <span className="muted">三餐与额外花销</span>
            </div>
            <TrendChart data={series} />
          </section>

          <div className="stats-chart-grid">
            <section className="section-block">
              <div className="section-title">
                <div>
                  <p className="eyebrow">构成</p>
                  <h2>三餐 / 额外</h2>
                </div>
              </div>
              <DonutChart
                data={[
                  { name: "三餐", value: summary.foodTotal },
                  { name: "额外", value: summary.extraTotal }
                ]}
                centerLabel="总支出"
                centerValue={summary.total}
              />
            </section>
            <section className="section-block">
              <div className="section-title">
                <div>
                  <p className="eyebrow">三餐</p>
                  <h2>餐别构成</h2>
                </div>
              </div>
              <div className="meal-pill-list">
                {meals.map((meal) => (
                  <button key={meal.meal} type="button" className="meal-pill" onClick={() => onSelectMeal(meal.meal)}>
                    <span>{meal.label}</span>
                    <strong>{formatCurrency(meal.amount)}</strong>
                    <em>{meal.share}%</em>
                  </button>
                ))}
              </div>
              <DonutChart
                data={meals.map((meal) => ({ name: meal.label, value: meal.amount }))}
                centerLabel="三餐合计"
                centerValue={summary.foodTotal}
                height={210}
              />
            </section>
          </div>
        </>
      )}
    </section>
  );
}

function Kpi({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );

  if (onClick) {
    return (
      <button className="metric stats-kpi clickable" type="button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className="metric stats-kpi">{content}</div>;
}
