import type { AppData } from "../types";

const cachePrefix = "budget-ledger-cache:";

export function saveCachedData(userId: string, data: AppData): void {
  localStorage.setItem(`${cachePrefix}${userId}`, JSON.stringify({ data, savedAt: new Date().toISOString() }));
}

export function readCachedData(userId: string): { data: AppData; savedAt: string } | null {
  const raw = localStorage.getItem(`${cachePrefix}${userId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as { data: AppData; savedAt: string };
  } catch {
    localStorage.removeItem(`${cachePrefix}${userId}`);
    return null;
  }
}
