import { describe, expect, it } from "vitest";
import { EXTRA_EXPENSE_CATEGORIES } from "./extraCategories";

describe("extra expense categories", () => {
  it("matches the requested category list and order", () => {
    expect(EXTRA_EXPENSE_CATEGORIES).toEqual([
      "餐饮",
      "交通",
      "日用品",
      "学习成长",
      "数码订阅",
      "娱乐社交",
      "服饰美容",
      "健康医疗",
      "人情礼物",
      "旅行住宿",
      "其他"
    ]);
  });
});
