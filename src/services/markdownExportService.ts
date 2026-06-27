import type { AppData, BudgetPlan, BudgetStatus, DayRecord, ExtraExpense, MealKey } from "../types";
import { calculateAllBudgetsStatus, calculateDayTotal, summarizeMonth } from "../utils/budgetCalculations";
import { formatChineseDate, getMonthDateKeys, getMonthKey, parseLocalDate } from "../utils/dateUtils";
import { formatCurrency, formatSignedDiff } from "../utils/format";
import { getLunarDate } from "../utils/lunar";

const mealRows: { key: MealKey; label: string; noteKey: "breakfastNote" | "lunchNote" | "dinnerNote" }[] = [
  { key: "breakfast", label: "早餐", noteKey: "breakfastNote" },
  { key: "lunch", label: "午餐", noteKey: "lunchNote" },
  { key: "dinner", label: "晚餐", noteKey: "dinnerNote" }
];

type MarkdownExport = {
  filename: string;
  content: string;
};

export function createDayMarkdownExport(data: AppData, selectedDateKey: string): MarkdownExport {
  return {
    filename: `budget-day-${selectedDateKey}.md`,
    content: renderDayMarkdown(data, selectedDateKey, 1)
  };
}

export function createMonthMarkdownExport(data: AppData, displayedMonth: Date): MarkdownExport {
  const monthKey = getMonthKey(displayedMonth);
  return {
    filename: `budget-month-${monthKey}.md`,
    content: renderMonthMarkdown(data, displayedMonth, 1)
  };
}

export function createFullMarkdownExport(data: AppData): MarkdownExport {
  const monthKeys = Array.from(
    new Set([
      ...data.dayRecords.map((record) => record.date.slice(0, 7)),
      ...data.extraExpenses.map((expense) => expense.date.slice(0, 7))
    ])
  ).sort();
  const todayKey = new Date().toISOString().slice(0, 10);
  const content = [
    "# 生活费预算记账完整导出",
    "",
    `导出时间：${new Date().toLocaleString("zh-CN")}`,
    "",
    "## 预算档位",
    "",
    renderBudgetList(data.budgets),
    "",
    ...(monthKeys.length
      ? monthKeys.flatMap((monthKey) => ["", renderMonthMarkdown(data, parseLocalDate(`${monthKey}-01`), 2)])
      : ["暂无记账数据。"])
  ].join("\n");

  return {
    filename: `budget-ledger-full-${todayKey}.md`,
    content
  };
}

function renderDayMarkdown(data: AppData, dateKey: string, headingLevel: 1 | 2 | 3): string {
  const date = parseLocalDate(dateKey);
  const dayRecord = data.dayRecords.find((record) => record.date === dateKey);
  const expenses = data.extraExpenses.filter((expense) => expense.date === dateKey);
  const totals = calculateDayTotal(dayRecord, expenses);
  const statuses = calculateAllBudgetsStatus({
    budgets: data.budgets,
    dayRecords: data.dayRecords,
    extraExpenses: data.extraExpenses,
    selectedDate: date
  });
  const prefix = "#".repeat(headingLevel);

  return [
    `${prefix} ${dateKey} ${formatChineseDate(date).replace(/^\d+年\d+月\d+日\s*/, "")}`,
    "",
    `农历：${getLunarDate(date).full}`,
    "",
    "## 三餐",
    "",
    "| 餐次 | 金额 | 备注 |",
    "| --- | ---: | --- |",
    ...mealRows.map((meal) => {
      const amount = dayRecord?.[meal.key] ?? null;
      return `| ${meal.label} | ${amount === null ? "未记录" : formatCurrency(amount)} | ${escapeCell(dayRecord?.[meal.noteKey] || "")} |`;
    }),
    "",
    `日备注：${dayRecord?.note || "无"}`,
    "",
    "## 额外花销",
    "",
    renderExpenseTable(expenses),
    "",
    "## 当日合计",
    "",
    `- 三餐合计：${formatCurrency(totals.foodTotal)}`,
    `- 额外花销：${formatCurrency(totals.extraTotal)}`,
    `- 今日总花销：${formatCurrency(totals.total)}`,
    "",
    "## 预算对比",
    "",
    renderBudgetStatusTable(data.budgets, statuses)
  ].join("\n");
}

function renderMonthMarkdown(data: AppData, displayedMonth: Date, headingLevel: 1 | 2): string {
  const monthKey = getMonthKey(displayedMonth);
  const summary = summarizeMonth(data.dayRecords, data.extraExpenses, displayedMonth);
  const monthDateKeys = getMonthDateKeys(displayedMonth);
  const lastDayKey = monthDateKeys[monthDateKeys.length - 1] ?? `${monthKey}-01`;
  const statuses = calculateAllBudgetsStatus({
    budgets: data.budgets,
    dayRecords: data.dayRecords,
    extraExpenses: data.extraExpenses,
    selectedDate: parseLocalDate(lastDayKey)
  });
  const prefix = "#".repeat(headingLevel);
  const dateRows = monthDateKeys.map((dateKey) => {
    const record = data.dayRecords.find((item) => item.date === dateKey);
    const expenses = data.extraExpenses.filter((expense) => expense.date === dateKey);
    const totals = calculateDayTotal(record, expenses);
    return `| ${dateKey} | ${formatCurrency(totals.foodTotal)} | ${formatCurrency(totals.extraTotal)} | ${formatCurrency(totals.total)} | ${record?.note ? escapeCell(record.note) : ""} |`;
  });

  return [
    `${prefix} ${monthKey} 月度记录`,
    "",
    "## 月度总览",
    "",
    `- 本月总支出：${formatCurrency(summary.total)}`,
    `- 三餐总支出：${formatCurrency(summary.foodTotal)}`,
    `- 额外花销总支出：${formatCurrency(summary.extraTotal)}`,
    `- 早餐总支出：${formatCurrency(summary.breakfast)}`,
    `- 午餐总支出：${formatCurrency(summary.lunch)}`,
    `- 晚餐总支出：${formatCurrency(summary.dinner)}`,
    `- 平均每天花销：${formatCurrency(summary.averageDaily)}`,
    `- 平均每顿花销：${formatCurrency(summary.averageMeal)}`,
    "",
    "## 额外花销分类",
    "",
    renderCategoryTable(summary.categoryTotals),
    "",
    "## 月末预算状态",
    "",
    renderBudgetStatusTable(data.budgets, statuses),
    "",
    "## 每日明细",
    "",
    "| 日期 | 三餐 | 额外 | 总计 | 日备注 |",
    "| --- | ---: | ---: | ---: | --- |",
    ...dateRows
  ].join("\n");
}

function renderBudgetList(budgets: BudgetPlan[]): string {
  if (!budgets.length) return "暂无预算档位。";
  return [
    "| 名称 | 月预算 | 默认 |",
    "| --- | ---: | --- |",
    ...budgets.map((budget) => `| ${escapeCell(budget.name)} | ${formatCurrency(budget.monthlyAmount)} | ${budget.isDefault ? "是" : "否"} |`)
  ].join("\n");
}

function renderExpenseTable(expenses: ExtraExpense[]): string {
  if (!expenses.length) return "暂无额外花销。";
  return [
    "| 金额 | 分类 | 备注 |",
    "| ---: | --- | --- |",
    ...expenses.map((expense) => `| ${formatCurrency(expense.amount)} | ${escapeCell(expense.category)} | ${escapeCell(expense.note || "")} |`)
  ].join("\n");
}

function renderCategoryTable(categoryTotals: Record<string, number>): string {
  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "暂无额外花销。";
  return ["| 分类 | 金额 |", "| --- | ---: |", ...entries.map(([category, amount]) => `| ${escapeCell(category)} | ${formatCurrency(amount)} |`)].join("\n");
}

function renderBudgetStatusTable(budgets: BudgetPlan[], statuses: Map<string, BudgetStatus>): string {
  if (!budgets.length) return "暂无预算档位。";
  return [
    "| 预算 | 今日预算 | 今日节约/超支 | 本月至今 | 本月剩余 | 剩余每天 | 剩余每顿 | 使用率 |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...budgets.map((budget) => {
      const status = statuses.get(budget.id);
      if (!status) return `| ${escapeCell(budget.name)} | 待计算 | 待计算 | 待计算 | 待计算 | 待计算 | 待计算 | 待计算 |`;
      return [
        `| ${escapeCell(budget.name)}`,
        formatCurrency(status.dynamicDailyAllowance),
        formatSignedDiff(status.selectedDayDiff),
        formatSignedDiff(status.diffToDate),
        formatCurrency(status.remainingMonthBalance),
        formatCurrency(status.remainingDailyAllowance),
        formatCurrency(status.remainingMealAllowance),
        `${Math.round(status.usageRate * 100)}% |`
      ].join(" | ");
    })
  ].join("\n");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
