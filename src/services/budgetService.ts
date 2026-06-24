import { requireSupabase } from "../lib/supabase";
import type { BudgetPlan, ServiceResult } from "../types";
import { mapBudget } from "./mappers";

export async function fetchBudgets(userId: string): Promise<ServiceResult<BudgetPlan[]>> {
  const { data, error } = await requireSupabase()
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .order("monthly_amount", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data.map(mapBudget), error: null };
}

export async function initializeDefaultBudgets(userId: string): Promise<ServiceResult<BudgetPlan[]>> {
  const now = new Date().toISOString();
  const defaults = [
    { user_id: userId, name: "紧缩 2000", monthly_amount: 2000, is_default: true },
    { user_id: userId, name: "正常 3000", monthly_amount: 3000, is_default: false },
    { user_id: userId, name: "宽松 4000", monthly_amount: 4000, is_default: false }
  ];

  const { data, error } = await requireSupabase()
    .from("budgets")
    .insert(defaults)
    .select("*")
    .order("monthly_amount", { ascending: true });

  if (error) return { data: null, error: error.message };
  await requireSupabase()
    .from("app_settings")
    .upsert({ user_id: userId, default_budget_id: data.find((budget) => budget.is_default)?.id ?? data[0]?.id, updated_at: now });
  return { data: data.map(mapBudget), error: null };
}

export async function createBudget(userId: string, name: string, monthlyAmount: number): Promise<ServiceResult<BudgetPlan>> {
  const { data, error } = await requireSupabase()
    .from("budgets")
    .insert({ user_id: userId, name, monthly_amount: monthlyAmount, currency: "CNY", is_default: false })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: mapBudget(data), error: null };
}

export async function updateBudget(id: string, values: { name: string; monthlyAmount: number }): Promise<ServiceResult<BudgetPlan>> {
  const { data, error } = await requireSupabase()
    .from("budgets")
    .update({ name: values.name, monthly_amount: values.monthlyAmount, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: mapBudget(data), error: null };
}

export async function deleteBudget(id: string): Promise<ServiceResult<null>> {
  const { error } = await requireSupabase().from("budgets").delete().eq("id", id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export async function setDefaultBudget(userId: string, budgetId: string): Promise<ServiceResult<null>> {
  const client = requireSupabase();
  const { error: resetError } = await client.from("budgets").update({ is_default: false }).eq("user_id", userId);
  if (resetError) return { data: null, error: resetError.message };

  const { error: budgetError } = await client.from("budgets").update({ is_default: true }).eq("id", budgetId).eq("user_id", userId);
  if (budgetError) return { data: null, error: budgetError.message };

  const { error: settingsError } = await client
    .from("app_settings")
    .upsert({ user_id: userId, default_budget_id: budgetId, updated_at: new Date().toISOString() });
  if (settingsError) return { data: null, error: settingsError.message };

  return { data: null, error: null };
}
