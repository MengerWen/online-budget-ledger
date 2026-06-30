import { describe, expect, it } from "vitest";
import type { DayRecord, ExtraExpense } from "../types";
import { categoryDetail, dailySeries, extraByCategory, mealBreakdown, presetRange, summarizeRange } from "./stats";

function day(date: string, breakfast: number | null, lunch: number | null, dinner: number | null): DayRecord {
  return {
    id: `d-${date}`,
    user_id: "u1",
    date,
    breakfast,
    lunch,
    dinner,
    breakfastNote: null,
    lunchNote: null,
    dinnerNote: null,
    note: null,
    createdAt: "",
    updatedAt: ""
  };
}

function extra(date: string, category: string, amount: number): ExtraExpense {
  return {
    id: `e-${date}-${category}-${amount}`,
    user_id: "u1",
    date,
    category,
    amount,
    note: null,
    createdAt: "",
    updatedAt: ""
  };
}

const records = [
  day("2026-05-31", 8, 20, 22),
  day("2026-06-01", 10, 20, 30),
  day("2026-06-03", null, 25, 35)
];

const extras = [
  extra("2026-06-01", "交通", 12),
  extra("2026-06-02", "日用品", 30),
  extra("2026-06-03", "交通", 40),
  extra("2026-06-03", "餐饮", 10)
];

describe("stats ranges", () => {
  it("builds preset range boundaries with Monday-first weeks", () => {
    expect(presetRange("today", "2026-06-30")).toEqual({ start: "2026-06-30", end: "2026-06-30" });
    expect(presetRange("yesterday", "2026-06-30")).toEqual({ start: "2026-06-29", end: "2026-06-29" });
    expect(presetRange("dayBefore", "2026-06-30")).toEqual({ start: "2026-06-28", end: "2026-06-28" });
    expect(presetRange("thisWeek", "2026-06-30")).toEqual({ start: "2026-06-29", end: "2026-06-30" });
    expect(presetRange("lastMonth", "2026-06-30")).toEqual({ start: "2026-05-01", end: "2026-05-31" });
    expect(presetRange("last30", "2026-06-30")).toEqual({ start: "2026-06-01", end: "2026-06-30" });
  });

  it("summarizes across month boundaries inclusively", () => {
    const summary = summarizeRange({ start: "2026-05-31", end: "2026-06-01" }, records, extras);
    expect(summary.foodTotal).toBe(110);
    expect(summary.extraTotal).toBe(12);
    expect(summary.total).toBe(122);
    expect(summary.entryCount).toBe(7);
    expect(summary.recordedDays).toBe(2);
  });

  it("fills missing dates with zeroes in daily series", () => {
    const series = dailySeries({ start: "2026-06-01", end: "2026-06-03" }, records, extras);
    expect(series).toHaveLength(3);
    expect(series[1]).toMatchObject({ date: "2026-06-02", breakfast: 0, lunch: 0, dinner: 0, food: 0, extra: 30, total: 30 });
  });

  it("sorts extra categories descending and keeps shares near 100 percent", () => {
    const grouped = extraByCategory({ start: "2026-06-01", end: "2026-06-03" }, extras);
    expect(grouped.map((item) => item.category)).toEqual(["交通", "日用品", "餐饮"]);
    expect(grouped[0]).toMatchObject({ amount: 52, count: 2 });
    expect(grouped.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(100, 1);
  });

  it("calculates meal shares against the three-meal total", () => {
    const meals = mealBreakdown({ start: "2026-06-01", end: "2026-06-03" }, records);
    expect(meals.map((item) => item.label)).toEqual(["早餐", "午餐", "晚餐"]);
    expect(meals.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(100, 1);
  });

  it("returns category detail sorted by amount with a full daily trend", () => {
    const detail = categoryDetail({ start: "2026-06-01", end: "2026-06-03" }, "交通", extras);
    expect(detail.items.map((item) => item.amount)).toEqual([40, 12]);
    expect(detail.daily).toEqual([
      { date: "2026-06-01", amount: 12 },
      { date: "2026-06-02", amount: 0 },
      { date: "2026-06-03", amount: 40 }
    ]);
  });
});
