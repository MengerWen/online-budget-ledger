import type { AppData, BudgetPlan, DayRecord, ExtraExpense } from "../types";
import { validateImportPayload } from "../utils/validation";

export function exportData(data: AppData): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      budgets: data.budgets,
      dayRecords: data.dayRecords,
      extraExpenses: data.extraExpenses,
      settings: data.settings
    },
    null,
    2
  );
}

export function parseImportData(text: string): { data: Pick<AppData, "budgets" | "dayRecords" | "extraExpenses"> | null; error: string | null } {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!validateImportPayload(parsed)) {
      return { data: null, error: "JSON 格式不符合导入要求" };
    }
    const payload = parsed as { budgets: BudgetPlan[]; dayRecords: DayRecord[]; extraExpenses: ExtraExpense[] };
    return {
      data: {
        budgets: payload.budgets,
        dayRecords: payload.dayRecords,
        extraExpenses: payload.extraExpenses
      },
      error: null
    };
  } catch {
    return { data: null, error: "JSON 解析失败，请检查文件内容" };
  }
}
