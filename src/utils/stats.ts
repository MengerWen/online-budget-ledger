import dayjs from "dayjs";
import type { DayRecord, ExtraExpense, MealKey } from "../types";
import { calculateDayTotal } from "./budgetCalculations";
import { roundMoney } from "./format";

export type DateRange = { start: string; end: string };

export type PresetRangeKind =
  | "today"
  | "yesterday"
  | "dayBefore"
  | "thisWeek"
  | "thisMonth"
  | "lastMonth"
  | "last30"
  | "thisYear";

export type DailyStatsPoint = {
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  food: number;
  extra: number;
  total: number;
};

export type RangeSummary = {
  total: number;
  foodTotal: number;
  extraTotal: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  dailyAverage: number;
  mealAverage: number;
  entryCount: number;
  recordedDays: number;
};

export type MealBreakdownItem = {
  meal: MealKey;
  label: string;
  amount: number;
  avg: number;
  share: number;
};

const mealLabels: Record<MealKey, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐"
};

const mealKeys: MealKey[] = ["breakfast", "lunch", "dinner"];

function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

function valueOrZero(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

export function dayCount(range: DateRange): number {
  const start = dayjs(range.start);
  const end = dayjs(range.end);
  return Math.max(end.diff(start, "day") + 1, 0);
}

export function presetRange(kind: PresetRangeKind, today = dayjs().format("YYYY-MM-DD")): DateRange {
  const current = dayjs(today);

  if (kind === "today") return { start: current.format("YYYY-MM-DD"), end: current.format("YYYY-MM-DD") };
  if (kind === "yesterday") {
    const date = current.subtract(1, "day");
    return { start: date.format("YYYY-MM-DD"), end: date.format("YYYY-MM-DD") };
  }
  if (kind === "dayBefore") {
    const date = current.subtract(2, "day");
    return { start: date.format("YYYY-MM-DD"), end: date.format("YYYY-MM-DD") };
  }
  if (kind === "thisWeek") {
    const mondayOffset = (current.day() + 6) % 7;
    return {
      start: current.subtract(mondayOffset, "day").format("YYYY-MM-DD"),
      end: current.format("YYYY-MM-DD")
    };
  }
  if (kind === "thisMonth") {
    return {
      start: current.startOf("month").format("YYYY-MM-DD"),
      end: current.endOf("month").format("YYYY-MM-DD")
    };
  }
  if (kind === "lastMonth") {
    const previous = current.subtract(1, "month");
    return {
      start: previous.startOf("month").format("YYYY-MM-DD"),
      end: previous.endOf("month").format("YYYY-MM-DD")
    };
  }
  if (kind === "last30") {
    return {
      start: current.subtract(29, "day").format("YYYY-MM-DD"),
      end: current.format("YYYY-MM-DD")
    };
  }
  return {
    start: current.startOf("year").format("YYYY-MM-DD"),
    end: current.endOf("year").format("YYYY-MM-DD")
  };
}

export function dailySeries(range: DateRange, dayRecords: DayRecord[], extras: ExtraExpense[]): DailyStatsPoint[] {
  const byDate = new Map(dayRecords.filter((record) => inRange(record.date, range)).map((record) => [record.date, record]));
  const extrasByDate = extras.filter((expense) => inRange(expense.date, range)).reduce<Map<string, ExtraExpense[]>>((acc, expense) => {
    acc.set(expense.date, [...(acc.get(expense.date) ?? []), expense]);
    return acc;
  }, new Map());
  const result: DailyStatsPoint[] = [];

  for (let cursor = dayjs(range.start); !cursor.isAfter(dayjs(range.end), "day"); cursor = cursor.add(1, "day")) {
    const date = cursor.format("YYYY-MM-DD");
    const record = byDate.get(date);
    const dayExtras = extrasByDate.get(date) ?? [];
    const breakfast = roundMoney(valueOrZero(record?.breakfast));
    const lunch = roundMoney(valueOrZero(record?.lunch));
    const dinner = roundMoney(valueOrZero(record?.dinner));
    const totals = calculateDayTotal(record, dayExtras);
    result.push({ date, breakfast, lunch, dinner, food: totals.foodTotal, extra: totals.extraTotal, total: totals.total });
  }

  return result;
}

export function summarizeRange(range: DateRange, dayRecords: DayRecord[], extras: ExtraExpense[]): RangeSummary {
  const series = dailySeries(range, dayRecords, extras);
  const recordsInRange = dayRecords.filter((record) => inRange(record.date, range));
  const extrasInRange = extras.filter((expense) => inRange(expense.date, range));
  const breakfast = roundMoney(series.reduce((sum, point) => sum + point.breakfast, 0));
  const lunch = roundMoney(series.reduce((sum, point) => sum + point.lunch, 0));
  const dinner = roundMoney(series.reduce((sum, point) => sum + point.dinner, 0));
  const foodTotal = roundMoney(breakfast + lunch + dinner);
  const extraTotal = roundMoney(series.reduce((sum, point) => sum + point.extra, 0));
  const total = roundMoney(foodTotal + extraTotal);
  const activeMealCount = recordsInRange.reduce(
    (sum, record) => sum + mealKeys.filter((meal) => typeof record[meal] === "number").length,
    0
  );
  const recordedDates = new Set<string>();
  recordsInRange.forEach((record) => {
    if (calculateDayTotal(record, extrasInRange.filter((expense) => expense.date === record.date)).total > 0) recordedDates.add(record.date);
  });
  extrasInRange.forEach((expense) => {
    if (expense.amount > 0) recordedDates.add(expense.date);
  });

  return {
    total,
    foodTotal,
    extraTotal,
    breakfast,
    lunch,
    dinner,
    dailyAverage: roundMoney(total / Math.max(dayCount(range), 1)),
    mealAverage: roundMoney(foodTotal / Math.max(activeMealCount, 1)),
    entryCount: activeMealCount + extrasInRange.length,
    recordedDays: recordedDates.size
  };
}

export function extraByCategory(range: DateRange, extras: ExtraExpense[]) {
  const extrasInRange = extras.filter((expense) => inRange(expense.date, range));
  const total = roundMoney(extrasInRange.reduce((sum, expense) => sum + expense.amount, 0));
  const grouped = extrasInRange.reduce<Map<string, { amount: number; count: number }>>((acc, expense) => {
    const current = acc.get(expense.category) ?? { amount: 0, count: 0 };
    acc.set(expense.category, { amount: roundMoney(current.amount + expense.amount), count: current.count + 1 });
    return acc;
  }, new Map());

  return [...grouped.entries()]
    .map(([category, item]) => ({
      category,
      amount: item.amount,
      count: item.count,
      share: total > 0 ? roundMoney((item.amount / total) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function mealBreakdown(range: DateRange, dayRecords: DayRecord[]): MealBreakdownItem[] {
  const records = dayRecords.filter((record) => inRange(record.date, range));
  const total = mealKeys.reduce((sum, meal) => sum + records.reduce((mealSum, record) => mealSum + valueOrZero(record[meal]), 0), 0);

  return mealKeys.map((meal) => {
    const values = records.map((record) => record[meal]).filter((value): value is number => typeof value === "number");
    const amount = roundMoney(values.reduce((sum, value) => sum + value, 0));
    return {
      meal,
      label: mealLabels[meal],
      amount,
      avg: roundMoney(amount / Math.max(values.length, 1)),
      share: total > 0 ? roundMoney((amount / total) * 100) : 0
    };
  });
}

export function categoryDetail(range: DateRange, category: string, extras: ExtraExpense[]) {
  const items = extras
    .filter((expense) => inRange(expense.date, range) && expense.category === category)
    .sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date));
  const total = roundMoney(items.reduce((sum, expense) => sum + expense.amount, 0));
  const byDate = items.reduce<Map<string, number>>((acc, expense) => {
    acc.set(expense.date, roundMoney((acc.get(expense.date) ?? 0) + expense.amount));
    return acc;
  }, new Map());
  const daily = dailySeries(range, [], []).map((point) => ({ date: point.date, amount: byDate.get(point.date) ?? 0 }));

  return { items, daily, total, count: items.length };
}

export function mealDetail(range: DateRange, meal: MealKey, dayRecords: DayRecord[]) {
  const records = dayRecords.filter((record) => inRange(record.date, range) && typeof record[meal] === "number");
  const values = records.map((record) => ({ date: record.date, amount: valueOrZero(record[meal]) }));
  const total = roundMoney(values.reduce((sum, item) => sum + item.amount, 0));
  const average = roundMoney(total / Math.max(values.length, 1));
  const daily = dailySeries(range, dayRecords, []).map((point) => ({ date: point.date, amount: point[meal] }));

  return {
    label: mealLabels[meal],
    items: values.sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date)),
    daily,
    total,
    count: values.length,
    average
  };
}
