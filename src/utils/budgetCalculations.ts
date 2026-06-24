import type { BudgetPlan, BudgetStatus, DayRecord, ExtraExpense, MealDiff, MealKey } from "../types";
import { getDaysInMonth, getTodayInLocalTimezone, parseLocalDate, toDateKey } from "./dateUtils";
import { roundMoney } from "./format";

const mealKeys: MealKey[] = ["breakfast", "lunch", "dinner"];

function valueOrZero(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

export function calculateDayTotal(dayRecord: DayRecord | undefined, extraExpenses: ExtraExpense[]) {
  const foodTotal = dayRecord
    ? mealKeys.reduce((sum, key) => sum + valueOrZero(dayRecord[key]), 0)
    : 0;
  const extraTotal = extraExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  return {
    foodTotal: roundMoney(foodTotal),
    extraTotal: roundMoney(extraTotal),
    total: roundMoney(foodTotal + extraTotal)
  };
}

export function calculateMealDiff(params: { actual?: number | null; mealAllowance: number }): MealDiff {
  if (params.actual === undefined || params.actual === null) {
    return { status: "empty", diff: null };
  }
  const diff = roundMoney(params.mealAllowance - params.actual);
  if (Math.abs(diff) < 0.005) return { status: "even", diff: 0 };
  return { status: diff > 0 ? "saved" : "overspent", diff };
}

export function calculateFixedMealAllowance(monthlyAmount: number, daysInMonth: number, meal: MealKey): number {
  const daily = monthlyAmount / daysInMonth;
  if (meal === "breakfast") return Math.min(10, daily / 3);
  return Math.max((daily - Math.min(10, daily / 3)) / 2, 0);
}

export function calculateAllBudgetsStatus(params: {
  budgets: BudgetPlan[];
  dayRecords: DayRecord[];
  extraExpenses: ExtraExpense[];
  selectedDate: Date;
}): Map<string, BudgetStatus> {
  const selectedDateKey = toDateKey(params.selectedDate);
  const todayKey = getTodayInLocalTimezone();
  const year = params.selectedDate.getFullYear();
  const month = params.selectedDate.getMonth() + 1;
  const daysInMonth = getDaysInMonth(year, month);
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const selectedDay = Number(selectedDateKey.slice(8, 10));
  const selectedDayRecord = params.dayRecords.find((record) => record.date === selectedDateKey);
  const selectedDayExtras = params.extraExpenses.filter((expense) => expense.date === selectedDateKey);
  const selectedDayTotal = calculateDayTotal(selectedDayRecord, selectedDayExtras).total;
  const monthRecords = params.dayRecords.filter((record) => record.date.startsWith(monthPrefix));
  const monthExtras = params.extraExpenses.filter((expense) => expense.date.startsWith(monthPrefix));

  const spentBeforeDate = sumRangeTotals(monthRecords, monthExtras, monthPrefix, 1, selectedDay - 1);
  const monthSpentToDate = sumRangeTotals(monthRecords, monthExtras, monthPrefix, 1, selectedDay);
  const isHistoricalDate = selectedDateKey < todayKey;
  const statuses = new Map<string, BudgetStatus>();

  params.budgets.forEach((budget) => {
    const fixedDailyAllowance = budget.monthlyAmount / daysInMonth;
    const fixedMealAllowance = fixedDailyAllowance / 3;
    const remainingDaysIncludingSelectedDate = daysInMonth - selectedDay + 1;
    const dynamicDailyAllowance = isHistoricalDate
      ? fixedDailyAllowance
      : (budget.monthlyAmount - spentBeforeDate) / Math.max(remainingDaysIncludingSelectedDate, 1);
    const monthBudgetToDate = fixedDailyAllowance * selectedDay;
    const remainingMonthBalance = budget.monthlyAmount - monthSpentToDate;
    const remainingDaysAfterSelectedDate = Math.max(daysInMonth - selectedDay, 1);

    statuses.set(budget.id, {
      budgetId: budget.id,
      budgetName: budget.name,
      monthlyAmount: budget.monthlyAmount,
      daysInMonth,
      fixedDailyAllowance: roundMoney(fixedDailyAllowance),
      fixedMealAllowance: roundMoney(fixedMealAllowance),
      dynamicDailyAllowance: roundMoney(dynamicDailyAllowance),
      dynamicMealAllowance: roundMoney(dynamicDailyAllowance / 3),
      allowanceLabel: isHistoricalDate ? "历史日均（参考值）" : "动态剩余额度",
      selectedDayTotal,
      selectedDayDiff: roundMoney(dynamicDailyAllowance - selectedDayTotal),
      monthSpentToDate: roundMoney(monthSpentToDate),
      monthBudgetToDate: roundMoney(monthBudgetToDate),
      diffToDate: roundMoney(monthBudgetToDate - monthSpentToDate),
      remainingMonthBalance: roundMoney(remainingMonthBalance),
      remainingDailyAllowance: roundMoney(remainingMonthBalance / remainingDaysAfterSelectedDate),
      remainingMealAllowance: roundMoney(remainingMonthBalance / remainingDaysAfterSelectedDate / 3),
      usageRate: budget.monthlyAmount > 0 ? monthSpentToDate / budget.monthlyAmount : 0
    });
  });

  return statuses;
}

export function sumRangeTotals(
  dayRecords: DayRecord[],
  extraExpenses: ExtraExpense[],
  monthPrefix: string,
  startDay: number,
  endDay: number
): number {
  if (endDay < startDay) return 0;
  let total = 0;
  for (let day = startDay; day <= endDay; day += 1) {
    const key = `${monthPrefix}-${String(day).padStart(2, "0")}`;
    const dayRecord = dayRecords.find((record) => record.date === key);
    const extras = extraExpenses.filter((expense) => expense.date === key);
    total += calculateDayTotal(dayRecord, extras).total;
  }
  return roundMoney(total);
}

export function getDefaultBudget(budgets: BudgetPlan[], defaultBudgetId?: string | null): BudgetPlan | null {
  return budgets.find((budget) => budget.id === defaultBudgetId) ?? budgets.find((budget) => budget.isDefault) ?? budgets[0] ?? null;
}

export function summarizeMonth(dayRecords: DayRecord[], extraExpenses: ExtraExpense[], displayedMonth: Date) {
  const monthPrefix = toDateKey(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1)).slice(0, 7);
  const records = dayRecords.filter((record) => record.date.startsWith(monthPrefix));
  const extras = extraExpenses.filter((expense) => expense.date.startsWith(monthPrefix));
  const mealTotals = mealKeys.reduce<Record<MealKey, number>>(
    (acc, key) => {
      acc[key] = roundMoney(records.reduce((sum, record) => sum + valueOrZero(record[key]), 0));
      return acc;
    },
    { breakfast: 0, lunch: 0, dinner: 0 }
  );
  const extraTotal = roundMoney(extras.reduce((sum, expense) => sum + expense.amount, 0));
  const categoryTotals = extras.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = roundMoney((acc[expense.category] ?? 0) + expense.amount);
    return acc;
  }, {});
  const foodTotal = roundMoney(mealTotals.breakfast + mealTotals.lunch + mealTotals.dinner);
  const total = roundMoney(foodTotal + extraTotal);
  const daysInMonth = getDaysInMonth(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1);

  return {
    total,
    foodTotal,
    extraTotal,
    breakfast: mealTotals.breakfast,
    lunch: mealTotals.lunch,
    dinner: mealTotals.dinner,
    averageDaily: roundMoney(total / daysInMonth),
    averageMeal: roundMoney(foodTotal / Math.max(records.length * 3, 1)),
    categoryTotals
  };
}

export function isRecordComplete(record: DayRecord | undefined): boolean {
  return Boolean(record && record.breakfast !== null && record.lunch !== null && record.dinner !== null);
}

export function dateKeyToDate(dateKey: string): Date {
  return parseLocalDate(dateKey);
}
