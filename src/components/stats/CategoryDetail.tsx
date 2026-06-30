import type { BudgetPlan, DayRecord, ExtraExpense, MealKey } from "../../types";
import { calculateFixedMealAllowance } from "../../utils/budgetCalculations";
import { getDaysInMonth, parseLocalDate } from "../../utils/dateUtils";
import { diffClass, formatCurrency, formatSignedDiff, roundMoney } from "../../utils/format";
import type { DateRange } from "../../utils/stats";
import { categoryDetail, mealDetail, summarizeRange } from "../../utils/stats";
import { TrendChart } from "./charts/TrendChart";

export type Drill = null | { type: "extraCategory"; category: string } | { type: "meal"; meal: MealKey };

type Props = {
  drill: Exclude<Drill, null>;
  range: DateRange;
  dayRecords: DayRecord[];
  extras: ExtraExpense[];
  defaultBudget: BudgetPlan | null;
  onBack: () => void;
};

export function CategoryDetail({ drill, range, dayRecords, extras, defaultBudget, onBack }: Props) {
  const summary = summarizeRange(range, dayRecords, extras);

  if (drill.type === "extraCategory") {
    const detail = categoryDetail(range, drill.category, extras);
    const average = roundMoney(detail.total / Math.max(detail.count, 1));
    const largest = detail.items[0]?.amount ?? 0;
    const totalShare = summary.total > 0 ? roundMoney((detail.total / summary.total) * 100) : 0;
    const extraShare = summary.extraTotal > 0 ? roundMoney((detail.total / summary.extraTotal) * 100) : 0;

    return (
      <section className="stats-detail">
        <Breadcrumb label={drill.category} onBack={onBack} />
        <div className="stats-kpi-grid">
          <Kpi label="分类总额" value={formatCurrency(detail.total)} />
          <Kpi label="笔数" value={`${detail.count} 笔`} />
          <Kpi label="单笔均值" value={formatCurrency(average)} />
          <Kpi label="最大单笔" value={formatCurrency(largest)} />
        </div>
        <div className="stats-chart-grid">
          <section className="section-block">
            <div className="section-title">
              <div>
                <p className="eyebrow">趋势</p>
                <h2>{drill.category} 日趋势</h2>
              </div>
              <span className="muted">占额外 {extraShare}% · 占总支出 {totalShare}%</span>
            </div>
            <TrendChart data={detail.daily} mode="single" />
          </section>
          <section className="section-block">
            <div className="section-title">
              <div>
                <p className="eyebrow">明细</p>
                <h2>按金额降序</h2>
              </div>
            </div>
            {detail.items.length === 0 ? (
              <p className="empty-text">该分类暂无明细。</p>
            ) : (
              <div className="expense-list stats-expense-list">
                {detail.items.map((expense) => (
                  <details key={expense.id} className="expense-row stats-expense-row">
                    <summary>
                      <span>{expense.date}</span>
                      <strong>{formatCurrency(expense.amount)}</strong>
                      <em>{expense.note || "无备注"}</em>
                    </summary>
                    {expense.note && <p>{expense.note}</p>}
                  </details>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    );
  }

  const detail = mealDetail(range, drill.meal, dayRecords);
  const startDate = parseLocalDate(range.start);
  const allowance = defaultBudget
    ? calculateFixedMealAllowance(defaultBudget.monthlyAmount, getDaysInMonth(startDate.getFullYear(), startDate.getMonth() + 1), drill.meal)
    : 0;
  const savedDays = detail.items.filter((item) => allowance > 0 && item.amount <= allowance).length;
  const overspentDays = detail.items.filter((item) => allowance > 0 && item.amount > allowance).length;

  return (
    <section className="stats-detail">
      <Breadcrumb label={detail.label} onBack={onBack} />
      <div className="stats-kpi-grid">
        <Kpi label={`${detail.label}总额`} value={formatCurrency(detail.total)} />
        <Kpi label="记录天数" value={`${detail.count} 天`} />
        <Kpi label="均值" value={formatCurrency(detail.average)} />
        <Kpi label="参考额度" value={allowance > 0 ? formatCurrency(allowance) : "暂无预算"} />
        <Kpi label="节约天数" value={`${savedDays} 天`} />
        <Kpi label="超支天数" value={`${overspentDays} 天`} />
      </div>
      <div className="stats-chart-grid">
        <section className="section-block">
          <div className="section-title">
            <div>
              <p className="eyebrow">趋势</p>
              <h2>{detail.label}日趋势</h2>
            </div>
          </div>
          <TrendChart data={detail.daily} mode="single" />
        </section>
        <section className="section-block">
          <div className="section-title">
            <div>
              <p className="eyebrow">日期表现</p>
              <h2>按金额降序</h2>
            </div>
          </div>
          {detail.items.length === 0 ? (
            <p className="empty-text">该餐别暂无记录。</p>
          ) : (
            <div className="meal-detail-list">
              {detail.items.map((item) => {
                const diff = allowance > 0 ? allowance - item.amount : 0;
                return (
                  <p key={item.date}>
                    <span>{item.date}</span>
                    <strong>{formatCurrency(item.amount)}</strong>
                    <em className={allowance > 0 ? diffClass(diff) : "neutral"}>{allowance > 0 ? formatSignedDiff(diff) : "暂无预算对比"}</em>
                  </p>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function Breadcrumb({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="stats-breadcrumb">
      <button type="button" onClick={onBack}>统计</button>
      <span>/</span>
      <strong>{label}</strong>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric stats-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
