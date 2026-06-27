import { describe, expect, it } from "vitest";
import type { BudgetPlan, DayRecord, ExtraExpense } from "../types";
import { buildMondayFirstCalendar, getDaysInMonth, toDateKey } from "./dateUtils";
import { calculateAllBudgetsStatus, calculateDayTotal, calculateMealDiff } from "./budgetCalculations";

const budgets: BudgetPlan[] = [
  {
    id: "b-2000",
    user_id: "u1",
    name: "紧缩 2000",
    monthlyAmount: 2000,
    currency: "CNY",
    isDefault: true,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z"
  }
];

describe("date utils", () => {
  it("calculates leap and non-leap February days", () => {
    expect(getDaysInMonth(2024, 2)).toBe(29);
    expect(getDaysInMonth(2025, 2)).toBe(28);
  });

  it("builds Monday-first calendar matrices", () => {
    const cells = buildMondayFirstCalendar(new Date(2026, 5, 1));
    expect(cells[0] && toDateKey(cells[0])).toBe("2026-06-01");

    const sundayMonth = buildMondayFirstCalendar(new Date(2026, 1, 1));
    expect(sundayMonth.slice(0, 6).every((cell) => cell === null)).toBe(true);
    expect(sundayMonth[6] && toDateKey(sundayMonth[6])).toBe("2026-02-01");
  });
});

describe("budget calculations", () => {
  it("does not count empty meal fields but counts zero and extra expenses", () => {
    const record: DayRecord = {
      id: "r1",
      user_id: "u1",
      date: "2026-06-01",
      breakfast: 0,
      lunch: null,
      dinner: 20,
      breakfastNote: "没花钱",
      lunchNote: null,
      dinnerNote: "食堂",
      note: null,
      createdAt: "",
      updatedAt: ""
    };
    const extras: ExtraExpense[] = [
      { id: "e1", user_id: "u1", date: "2026-06-01", amount: 8, category: "交通", note: null, createdAt: "", updatedAt: "" }
    ];
    expect(calculateDayTotal(record, extras)).toEqual({ foodTotal: 20, extraTotal: 8, total: 28 });
  });

  it("returns correct daily allowances and signs for a 2000 budget in a 30-day month", () => {
    const statuses = calculateAllBudgetsStatus({
      budgets,
      selectedDate: new Date(2026, 5, 1),
      dayRecords: [
        {
          id: "r1",
          user_id: "u1",
          date: "2026-06-01",
          breakfast: 20,
          lunch: 30,
          dinner: 40,
          breakfastNote: null,
          lunchNote: null,
          dinnerNote: null,
          note: null,
          createdAt: "",
          updatedAt: ""
        }
      ],
      extraExpenses: []
    });
    const status = statuses.get("b-2000")!;
    expect(status.fixedDailyAllowance).toBe(66.67);
    expect(status.fixedMealAllowance).toBe(22.22);
    expect(status.selectedDayDiff).toBeLessThan(0);
  });

  it("keeps negative remaining balances visible", () => {
    const statuses = calculateAllBudgetsStatus({
      budgets,
      selectedDate: new Date(2026, 5, 30),
      dayRecords: [
        {
          id: "r1",
          user_id: "u1",
          date: "2026-06-30",
          breakfast: 1000,
          lunch: 1000,
          dinner: 1000,
          breakfastNote: null,
          lunchNote: null,
          dinnerNote: null,
          note: null,
          createdAt: "",
          updatedAt: ""
        }
      ],
      extraExpenses: []
    });
    expect(statuses.get("b-2000")!.remainingMonthBalance).toBe(-1000);
  });

  it("distinguishes empty, zero, saved, overspent, and even meal diffs", () => {
    expect(calculateMealDiff({ actual: null, mealAllowance: 10 }).status).toBe("empty");
    expect(calculateMealDiff({ actual: 0, mealAllowance: 10 })).toEqual({ status: "saved", diff: 10 });
    expect(calculateMealDiff({ actual: 12, mealAllowance: 10 }).status).toBe("overspent");
    expect(calculateMealDiff({ actual: 10, mealAllowance: 10 }).status).toBe("even");
  });
});
