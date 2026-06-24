export function parseMoneyInput(value: string): { value: number | null; error: string | null } {
  if (value.trim() === "") {
    return { value: null, error: null };
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return { value: null, error: "请输入有效金额" };
  }
  if (numberValue < 0) {
    return { value: null, error: "金额不能为负数" };
  }
  if (!/^\d+(\.\d{0,2})?$/.test(value.trim())) {
    return { value: null, error: "最多保留两位小数" };
  }

  return { value: Math.round(numberValue * 100) / 100, error: null };
}

export function validateBudgetAmount(value: number | null): string | null {
  if (value === null) return "请输入预算金额";
  if (value <= 0) return "预算必须大于 0";
  return null;
}

export function validateImportPayload(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return ["budgets", "dayRecords", "extraExpenses"].every((key) => Array.isArray(payload[key]));
}
