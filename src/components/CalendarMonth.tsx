import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { BudgetPlan, BudgetStatus, DayRecord, ExtraExpense } from "../types";
import { buildMondayFirstCalendar, getTodayInLocalTimezone, parseLocalDate, toDateKey } from "../utils/dateUtils";
import { CalendarDayCell } from "./CalendarDayCell";

type Props = {
  displayedMonth: Date;
  selectedDateKey: string;
  budgets: BudgetPlan[];
  dayRecords: DayRecord[];
  extraExpenses: ExtraExpense[];
  calendarBudgetId: string | "all";
  onCalendarBudgetChange: (value: string | "all") => void;
  getStatusesForDate: (date: Date) => Map<string, BudgetStatus>;
  onChangeMonth: (date: Date) => void;
  onSelectDate: (dateKey: string) => void;
};

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export function CalendarMonth({
  displayedMonth,
  selectedDateKey,
  budgets,
  dayRecords,
  extraExpenses,
  calendarBudgetId,
  onCalendarBudgetChange,
  getStatusesForDate,
  onChangeMonth,
  onSelectDate
}: Props) {
  const cells = buildMondayFirstCalendar(displayedMonth);
  const todayKey = getTodayInLocalTimezone();

  function shiftMonth(offset: number) {
    onChangeMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + offset, 1));
  }

  return (
    <section className="section-block calendar-section">
      <div className="calendar-toolbar">
        <div>
          <p className="eyebrow">月历</p>
          <h2>{displayedMonth.getFullYear()}年{displayedMonth.getMonth() + 1}月</h2>
        </div>
        <div className="toolbar-actions">
          <button className="icon-button" type="button" onClick={() => shiftMonth(-1)} title="上个月" aria-label="上个月">
            <ChevronLeft size={18} />
          </button>
          <button className="icon-button" type="button" onClick={() => onChangeMonth(parseLocalDate(todayKey))} title="回到今天" aria-label="回到今天">
            <RotateCcw size={18} />
          </button>
          <button className="icon-button" type="button" onClick={() => shiftMonth(1)} title="下个月" aria-label="下个月">
            <ChevronRight size={18} />
          </button>
          <label className="select-label">
            <CalendarDays size={16} />
            <select value={calendarBudgetId} onChange={(event) => onCalendarBudgetChange(event.target.value as string | "all")}>
              <option value="all">全部预算</option>
              {budgets.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="calendar-grid header">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((date, index) => {
          const dateKey = date ? toDateKey(date) : `empty-${index}`;
          return (
            <CalendarDayCell
              key={dateKey}
              date={date}
              selectedDateKey={selectedDateKey}
              todayKey={todayKey}
              dayRecord={date ? dayRecords.find((record) => record.date === dateKey) : undefined}
              extraExpenses={date ? extraExpenses.filter((expense) => expense.date === dateKey) : []}
              budgets={budgets}
              statuses={date ? getStatusesForDate(date) : new Map()}
              displayBudgetId={calendarBudgetId}
              onSelect={onSelectDate}
            />
          );
        })}
      </div>
    </section>
  );
}
