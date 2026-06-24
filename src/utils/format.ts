import type { MealDiff } from "../types";

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(roundMoney(amount));
}

export function formatSignedDiff(amount: number): string {
  if (Math.abs(amount) < 0.005) return "刚好";
  return amount > 0 ? `节约 ${formatCurrency(amount)}` : `超支 ${formatCurrency(Math.abs(amount))}`;
}

export function diffClass(amount: number): "positive" | "negative" | "neutral" {
  if (Math.abs(amount) < 0.005) return "neutral";
  return amount > 0 ? "positive" : "negative";
}

export function mealDiffText(diff: MealDiff): string {
  if (diff.status === "empty" || diff.diff === null) return "未记录";
  return formatSignedDiff(diff.diff);
}
