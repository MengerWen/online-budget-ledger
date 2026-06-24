import { CalendarCheck } from "lucide-react";
import type { RefObject } from "react";
import type { BudgetPlan, BudgetStatus, DayRecord, ExtraExpense } from "../types";
import { calculateDayTotal } from "../utils/budgetCalculations";
import { formatChineseDate, isFutureDate, parseLocalDate } from "../utils/dateUtils";
import { diffClass, formatCurrency, formatSignedDiff } from "../utils/format";
import { getLunarDate } from "../utils/lunar";
import { ExtraExpenseList } from "./ExtraExpenseList";
import { MealExpenseForm } from "./MealExpenseForm";

type Props = {
  selectedDateKey: string;
  dayRecord?: DayRecord;
  expenses: ExtraExpense[];
  budgets: BudgetPlan[];
  statuses: Map<string, BudgetStatus>;
  detailRef: RefObject<HTMLElement>;
  onSaveDayRecord: (values: Pick<DayRecord, "date" | "breakfast" | "lunch" | "dinner" | "note">) => Promise<void>;
  onCreateExpense: (values: Pick<ExtraExpense, "date" | "amount" | "category" | "note">) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
};

export function DayDetailPanel({
  selectedDateKey,
  dayRecord,
  expenses,
  budgets,
  statuses,
  detailRef,
  onSaveDayRecord,
  onCreateExpense,
  onDeleteExpense
}: Props) {
  const date = parseLocalDate(selectedDateKey);
  const lunar = getLunarDate(date);
  const totals = calculateDayTotal(dayRecord, expenses);

  return (
    <section className="section-block day-detail" ref={detailRef}>
      <div className="section-title">
        <div>
          <p className="eyebrow">日期详情</p>
          <h2>{formatChineseDate(date)}</h2>
          <span className="muted">{lunar.full}{isFutureDate(selectedDateKey) ? " / 未来日期" : ""}</span>
        </div>
        <CalendarCheck size={28} />
      </div>
      <MealExpenseForm dayRecord={dayRecord} budgets={budgets} statuses={statuses} selectedDateKey={selectedDateKey} onSave={onSaveDayRecord} />
      <ExtraExpenseList selectedDateKey={selectedDateKey} expenses={expenses} onCreate={onCreateExpense} onDelete={onDeleteExpense} />
      <div className="daily-summary">
        <Metric label="今日三餐合计" value={formatCurrency(totals.foodTotal)} />
        <Metric label="今日额外花销" value={formatCurrency(totals.extraTotal)} />
        <Metric label="今日总花销" value={formatCurrency(totals.total)} />
      </div>
      <div className="budget-table">
        <div className="budget-table-row header">
          <span>指标</span>
          {budgets.map((budget) => (
            <strong key={budget.id}>{budget.name}</strong>
          ))}
        </div>
        <TableRow label="今日预算（动态）" budgets={budgets} statuses={statuses} render={(status) => `${formatCurrency(status.dynamicDailyAllowance)} / ${status.allowanceLabel}`} />
        <TableRow label="今日节约/超支" budgets={budgets} statuses={statuses} render={(status) => formatSignedDiff(status.selectedDayDiff)} tone={(status) => diffClass(status.selectedDayDiff)} />
        <TableRow label="本月累计" budgets={budgets} statuses={statuses} render={(status) => formatSignedDiff(status.diffToDate)} tone={(status) => diffClass(status.diffToDate)} />
        <TableRow label="本月剩余" budgets={budgets} statuses={statuses} render={(status) => formatCurrency(status.remainingMonthBalance)} tone={(status) => diffClass(status.remainingMonthBalance)} />
        <TableRow label="剩余每顿" budgets={budgets} statuses={statuses} render={(status) => formatCurrency(status.remainingMealAllowance)} tone={(status) => diffClass(status.remainingMealAllowance)} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TableRow({
  label,
  budgets,
  statuses,
  render,
  tone
}: {
  label: string;
  budgets: BudgetPlan[];
  statuses: Map<string, BudgetStatus>;
  render: (status: BudgetStatus) => string;
  tone?: (status: BudgetStatus) => "positive" | "negative" | "neutral";
}) {
  return (
    <div className="budget-table-row">
      <span>{label}</span>
      {budgets.map((budget) => {
        const status = statuses.get(budget.id);
        return <strong key={budget.id} className={status && tone ? tone(status) : "neutral"}>{status ? render(status) : "待计算"}</strong>;
      })}
    </div>
  );
}
