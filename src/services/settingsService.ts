import { requireSupabase } from "../lib/supabase";
import type { AppSettings, ServiceResult } from "../types";
import { mapSettings } from "./mappers";

export async function fetchSettings(userId: string): Promise<ServiceResult<AppSettings | null>> {
  const { data, error } = await requireSupabase().from("app_settings").select("*").eq("user_id", userId).maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data ? mapSettings(data) : null, error: null };
}

export async function ensureSettings(userId: string, defaultBudgetId: string | null): Promise<ServiceResult<AppSettings>> {
  const { data, error } = await requireSupabase()
    .from("app_settings")
    .upsert({ user_id: userId, default_budget_id: defaultBudgetId, week_starts_on: 1 })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: mapSettings(data), error: null };
}
