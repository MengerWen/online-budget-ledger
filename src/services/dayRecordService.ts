import { requireSupabase } from "../lib/supabase";
import type { DayRecord, ServiceResult } from "../types";
import { mapDayRecord } from "./mappers";

export async function fetchDayRecords(userId: string): Promise<ServiceResult<DayRecord[]>> {
  const { data, error } = await requireSupabase()
    .from("day_records")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: data.map(mapDayRecord), error: null };
}

export async function upsertDayRecord(
  userId: string,
  values: Pick<DayRecord, "date" | "breakfast" | "lunch" | "dinner" | "note">
): Promise<ServiceResult<DayRecord>> {
  const client = requireSupabase();
  const payload = {
    user_id: userId,
    date: values.date,
    breakfast: values.breakfast,
    lunch: values.lunch,
    dinner: values.dinner,
    note: values.note,
    updated_at: new Date().toISOString()
  };
  const existing = await client
    .from("day_records")
    .select("id")
    .eq("user_id", userId)
    .eq("date", values.date)
    .maybeSingle();

  if (existing.error) return { data: null, error: existing.error.message };

  if (existing.data?.id) {
    const { data, error } = await client
      .from("day_records")
      .update(payload)
      .eq("id", existing.data.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) return { data: null, error: error.message };
    return { data: mapDayRecord(data), error: null };
  }

  const { data, error } = await client
    .from("day_records")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505" || error.message.includes("day_records_user_id_date_key")) {
      const fallback = await client
        .from("day_records")
        .update(payload)
        .eq("user_id", userId)
        .eq("date", values.date)
        .select("*")
        .single();

      if (fallback.error) return { data: null, error: fallback.error.message };
      return { data: mapDayRecord(fallback.data), error: null };
    }

    return { data: null, error: error.message };
  }

  return { data: mapDayRecord(data), error: null };
}
