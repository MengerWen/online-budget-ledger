import type { BudgetPlan, BudgetStatus, DayRecord, ExtraExpense } from "../types";
import { calculateDayTotal, isRecordComplete } from "../utils/budgetCalculations";
import { isWeekend, toDateKey } from "../utils/dateUtils";
import { diffClass, formatCurrency, formatSignedDiff } from "../utils/format";
import { getLunarDate } from "../utils/lunar";

type Props = {
  date: Date | null;
  selectedDateKey: string;
  todayKey: string;
  dayRecord?: DayRecord;
  extraExpenses: ExtraExpense[];
  budgets: BudgetPlan[];
  statuses: Map<string, BudgetStatus>;
  displayBudgetId: string | "all";
  onSelect: (dateKey: string) => void;
};

export function CalendarDayCell({
  date,
  selectedDateKey,
  todayKey,
  dayRecord,
  extraExpenses,
  budgets,
  statuses,
  displayBudgetId,
  onSelect
}: Props) {
  if (!date) return <div className="calendar-cell empty" />;

  const dateKey = toDateKey(date);
  const lunar = getLunarDate(date);
  const totals = calculateDayTotal(dayRecord, extraExpenses);
  const hasAnyRecord = Boolean(dayRecord || extraExpenses.length);
  const dayStatuses = budgets.map((budget) => statuses.get(budget.id)?.selectedDayDiff).filter((value): value is number => typeof value === "number");
  const allSaved = dayStatuses.length > 0 && dayStatuses.every((value) => value >= 0);
  const allOverspent = dayStatuses.length > 0 && dayStatuses.every((value) => value < 0);
  const mixed = dayStatuses.length > 0 && !allSaved && !allOverspent;
  const selectedStatus = displayBudgetId === "all" ? null : statuses.get(displayBudgetId);

  return (
    <button
      type="button"
      className={[
        "calendar-cell",
        isWeekend(date) ? "weekend" : "",
        dateKey === todayKey ? "today" : "",
        dateKey === selectedDateKey ? "selected" : "",
        hasAnyRecord ? "has-record" : ""
      ].join(" ")}
      onClick={() => onSelect(dateKey)}
    >
      <span className="cell-topline">
        <strong>{date.getDate()}</strong>
        {isWeekend(date) && <small>周末</small>}
      </span>
      <span className="lunar">{lunar.short}</span>
      <span className="meal-flags">
        <b className={dayRecord?.breakfast !== null && dayRecord?.breakfast !== undefined ? "done" : ""}>早</b>
        <b className={dayRecord?.lunch !== null && dayRecord?.lunch !== undefined ? "done" : ""}>午</b>
        <b className={dayRecord?.dinner !== null && dayRecord?.dinner !== undefined ? "done" : ""}>晚</b>
      </span>
      {hasAnyRecord && (
        <>
          <span className="cell-money">{formatCurrency(totals.total)}</span>
          {displayBudgetId === "all" ? (
            <span className={`status-dot ${allSaved ? "positive" : allOverspent ? "negative" : mixed ? "warning" : ""}`} />
          ) : (
            <span className={selectedStatus ? diffClass(selectedStatus.selectedDayDiff) : "neutral"}>
              {selectedStatus ? formatSignedDiff(selectedStatus.selectedDayDiff) : "无预算"}
            </span>
          )}
          <span className="cell-extra">{extraExpenses.length ? `额外 ${extraExpenses.length}` : isRecordComplete(dayRecord) ? "三餐完整" : "三餐未满"}</span>
        </>
      )}
    </button>
  );
}
