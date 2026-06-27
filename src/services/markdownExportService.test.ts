import { describe, expect, it } from "vitest";
import type { AppData } from "../types";
import { createDayMarkdownExport, createMonthMarkdownExport } from "./markdownExportService";

const fixture: AppData = {
  budgets: [
    {
      id: "b1",
      user_id: "u1",
      name: "正常 3000",
      monthlyAmount: 3000,
      currency: "CNY",
      isDefault: true,
      createdAt: "",
      updatedAt: ""
    }
  ],
  dayRecords: [
    {
      id: "d1",
      user_id: "u1",
      date: "2026-06-27",
      breakfast: 8,
      lunch: 25,
      dinner: null,
      breakfastNote: "豆浆",
      lunchNote: "和同学吃饭",
      dinnerNote: null,
      note: "周末复盘",
      createdAt: "",
      updatedAt: ""
    }
  ],
  extraExpenses: [
    {
      id: "e1",
      user_id: "u1",
      date: "2026-06-27",
      amount: 18,
      category: "学习成长",
      note: "资料",
      createdAt: "",
      updatedAt: ""
    }
  ],
  settings: null
};

describe("markdown exports", () => {
  it("exports selected day with meal notes, daily note, expenses, and budget status", () => {
    const result = createDayMarkdownExport(fixture, "2026-06-27");

    expect(result.filename).toBe("budget-day-2026-06-27.md");
    expect(result.content).toContain("豆浆");
    expect(result.content).toContain("和同学吃饭");
    expect(result.content).toContain("周末复盘");
    expect(result.content).toContain("学习成长");
    expect(result.content).toContain("正常 3000");
  });

  it("exports displayed month with monthly summary and daily rows", () => {
    const result = createMonthMarkdownExport(fixture, new Date(2026, 5, 1));

    expect(result.filename).toBe("budget-month-2026-06.md");
    expect(result.content).toContain("月度总览");
    expect(result.content).toContain("额外花销分类");
    expect(result.content).toContain("2026-06-27");
  });
});
