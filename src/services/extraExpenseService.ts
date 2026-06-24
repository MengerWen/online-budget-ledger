import { requireSupabase } from "../lib/supabase";
import type { ExtraExpense, ServiceResult } from "../types";
import { mapExtraExpense } from "./mappers";

export async function fetchExtraExpenses(userId: string): Promise<ServiceResult<ExtraExpense[]>> {
  const { data, error } = await requireSupabase()
    .from("extra_expenses")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data.map(mapExtraExpense), error: null };
}

export async function createExtraExpense(
  userId: string,
  values: Pick<ExtraExpense, "date" | "amount" | "category" | "note">
): Promise<ServiceResult<ExtraExpense>> {
  const { data, error } = await requireSupabase()
    .from("extra_expenses")
    .insert({ user_id: userId, ...values })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: mapExtraExpense(data), error: null };
}

export async function updateExtraExpense(
  id: string,
  values: Pick<ExtraExpense, "amount" | "category" | "note">
): Promise<ServiceResult<ExtraExpense>> {
  const { data, error } = await requireSupabase()
    .from("extra_expenses")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: mapExtraExpense(data), error: null };
}

export async function deleteExtraExpense(id: string): Promise<ServiceResult<null>> {
  const { error } = await requireSupabase().from("extra_expenses").delete().eq("id", id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}
