import type { AppSettings, BudgetPlan, DayRecord, ExtraExpense } from "../types";
import type { Database } from "../types/database";

type BudgetRow = Database["public"]["Tables"]["budgets"]["Row"];
type DayRecordRow = Database["public"]["Tables"]["day_records"]["Row"];
type ExtraExpenseRow = Database["public"]["Tables"]["extra_expenses"]["Row"];
type SettingsRow = Database["public"]["Tables"]["app_settings"]["Row"];

export function mapBudget(row: BudgetRow): BudgetPlan {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    monthlyAmount: Number(row.monthly_amount),
    currency: row.currency,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapDayRecord(row: DayRecordRow): DayRecord {
  return {
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    breakfast: row.breakfast === null ? null : Number(row.breakfast),
    lunch: row.lunch === null ? null : Number(row.lunch),
    dinner: row.dinner === null ? null : Number(row.dinner),
    breakfastNote: row.breakfast_note ?? null,
    lunchNote: row.lunch_note ?? null,
    dinnerNote: row.dinner_note ?? null,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapExtraExpense(row: ExtraExpenseRow): ExtraExpense {
  return {
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    amount: Number(row.amount),
    category: row.category,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapSettings(row: SettingsRow): AppSettings {
  return {
    user_id: row.user_id,
    defaultBudgetId: row.default_budget_id,
    weekStartsOn: 1,
    mealWeights: { breakfast: 1, lunch: 1, dinner: 1 },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
