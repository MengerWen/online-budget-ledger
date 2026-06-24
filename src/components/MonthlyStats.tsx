import type { BudgetPlan, DayRecord, ExtraExpense } from "../types";
import { calculateAllBudgetsStatus, calculateDayTotal, summarizeMonth } from "../utils/budgetCalculations";
import { getMonthDateKeys, parseLocalDate } from "../utils/dateUtils";
import { diffClass, formatCurrency, formatSignedDiff } from "../utils/format";

type Props = {
  displayedMonth: Date;
  budgets: BudgetPlan[];
  dayRecords: DayRecord[];
  extraExpenses: ExtraExpense[];
};

export function MonthlyStats({ displayedMonth, budgets, dayRecords, extraExpenses }: Props) {
  const summary = summarizeMonth(dayRecords, extraExpenses, displayedMonth);
  const dateKeys = getMonthDateKeys(displayedMonth);
  const defaultBudget = budgets.find((budget) => budget.isDefault) ?? budgets[0];
  const ranked = defaultBudget
    ? dateKeys
        .map((dateKey) => {
          const statuses = calculateAllBudgetsStatus({
            budgets: [defaultBudget],
            dayRecords,
            extraExpenses,
            selectedDate: parseLocalDate(dateKey)
          });
          return { dateKey, diff: statuses.get(defaultBudget.id)?.selectedDayDiff ?? 0 };
        })
        .filter((item) => {
          const record = dayRecords.find((day) => day.date === item.dateKey);
          const extras = extraExpenses.filter((expense) => expense.date === item.dateKey);
          return calculateDayTotal(record, extras).total > 0;
        })
    : [];
  const mostSaved = [...ranked].sort((a, b) => b.diff - a.diff)[0];
  const mostOverspent = [...ranked].sort((a, b) => a.diff - b.diff)[0];

  return (
    <section className="section-block">
      <div className="section-title">
        <h2>月度统计</h2>
        <span>{displayedMonth.getFullYear()}-{String(displayedMonth.getMonth() + 1).padStart(2, "0")}</span>
      </div>
      <div className="stats-grid">
        <Stat label="本月总支出" value={formatCurrency(summary.total)} />
        <Stat label="三餐总支出" value={formatCurrency(summary.foodTotal)} />
        <Stat label="额外花销" value={formatCurrency(summary.extraTotal)} />
        <Stat label="早餐" value={formatCurrency(summary.breakfast)} />
        <Stat label="午餐" value={formatCurrency(summary.lunch)} />
        <Stat label="晚餐" value={formatCurrency(summary.dinner)} />
        <Stat label="平均每天" value={formatCurrency(summary.averageDaily)} />
        <Stat label="平均每顿" value={formatCurrency(summary.averageMeal)} />
      </div>
      <div className="two-column-list">
        <div>
          <h3>额外花销分类</h3>
          {Object.entries(summary.categoryTotals).length === 0 && <p className="empty-text">暂无额外花销。</p>}
          {Object.entries(summary.categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([category, amount]) => (
              <p key={category}>
                <span>{category}</span>
                <strong>{formatCurrency(amount)}</strong>
              </p>
            ))}
        </div>
        <div>
          <h3>日期表现</h3>
          <p>
            <span>节约最多</span>
            <strong className={mostSaved ? diffClass(mostSaved.diff) : "neutral"}>{mostSaved ? `${mostSaved.dateKey} ${formatSignedDiff(mostSaved.diff)}` : "暂无记录"}</strong>
          </p>
          <p>
            <span>超支最多</span>
            <strong className={mostOverspent ? diffClass(mostOverspent.diff) : "neutral"}>{mostOverspent ? `${mostOverspent.dateKey} ${formatSignedDiff(mostOverspent.diff)}` : "暂无记录"}</strong>
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
