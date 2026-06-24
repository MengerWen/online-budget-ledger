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
  const { data, error } = await requireSupabase()
    .from("day_records")
    .upsert({
      user_id: userId,
      date: values.date,
      breakfast: values.breakfast,
      lunch: values.lunch,
      dinner: values.dinner,
      note: values.note,
      updated_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: mapDayRecord(data), error: null };
}
