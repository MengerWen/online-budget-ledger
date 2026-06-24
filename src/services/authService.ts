import { requireSupabase } from "../lib/supabase";
import type { ServiceResult } from "../types";

export async function signInWithEmail(email: string, password: string): Promise<ServiceResult<null>> {
  try {
    const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "登录失败" };
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<ServiceResult<null>> {
  try {
    const { error } = await requireSupabase().auth.signUp({ email, password });
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "注册失败" };
  }
}

export async function signOut(): Promise<ServiceResult<null>> {
  try {
    const { error } = await requireSupabase().auth.signOut();
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "退出失败" };
  }
}
