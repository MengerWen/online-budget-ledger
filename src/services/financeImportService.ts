import { requireSupabase } from '../lib/supabase';
import type { Json } from '../types/database';

export type FinanceEntry = {
  id: string; provider: string; sourceName: string; title: string;
  amountCents: number | null; currency: string; direction: string; status: string;
  date: string; occurredAt: string | null; receivedAt: string;
  merchant: string; category: string; reviewReasons: string[];
  identityKeys: string[]; sources: Record<string, unknown>[];
  evidenceOnly?: boolean; orderedAt?: string; paymentMethod?: string | null;
  paymentDateReviewRequired?: boolean;
};
export type FinancePosting = {
  id: string; canonical_id: string; date: string; amount_cents: number;
  direction: string; target: string; category: string; payload: Json;
};
export type Booking = FinanceEntry & {
  target: string; refundOf?: string; linkTo?: string; existingExpenseId?: string;
  paymentDateConfirmedFor?: string;
};

export function parseFinanceFile(text: string): FinanceEntry[] {
  const doc = JSON.parse(text) as { format?: unknown; entries?: unknown };
  if (doc.format !== 'dating-finance/v1' || !Array.isArray(doc.entries) || doc.entries.length > 10000) {
    throw new Error('请选择 Dating 导出的记账待核对 JSON。');
  }
  const ids = new Set<string>();
  return doc.entries.map((unknownEntry: unknown) => {
    if (!unknownEntry || typeof unknownEntry !== 'object') throw new Error('流水格式不完整。');
    const e = unknownEntry as FinanceEntry;
    if (typeof e.id !== 'string' || !e.id || e.id.length > 256 || ids.has(e.id) ||
        typeof e.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
        Number.isNaN(Date.parse(e.date)) || new Date(e.date).toISOString().slice(0,10) !== e.date ||
        !['expense', 'refund', 'income', 'transfer', 'unknown'].includes(e.direction) ||
        (e.amountCents !== null && (!Number.isSafeInteger(e.amountCents) || e.amountCents < 0 || e.amountCents > 1e12)) ||
        !Array.isArray(e.identityKeys) || !e.identityKeys.length || e.identityKeys.some(k => typeof k !== 'string' || !k || k.length > 500) ||
        !Array.isArray(e.sources) || !e.sources.length || e.sources.some(s => !s || typeof s !== 'object' || Array.isArray(s)) ||
        !Array.isArray(e.reviewReasons) || e.reviewReasons.some(r => typeof r !== 'string') ||
        typeof e.currency !== 'string' || typeof e.status !== 'string' || typeof e.provider !== 'string' || typeof e.sourceName !== 'string' ||
        (e.evidenceOnly !== undefined && typeof e.evidenceOnly !== 'boolean') ||
        (e.paymentDateReviewRequired !== undefined && typeof e.paymentDateReviewRequired !== 'boolean') ||
        typeof e.title !== 'string' || typeof e.merchant !== 'string' || typeof e.category !== 'string') {
      throw new Error('流水的金额、日期、来源或身份字段不符合要求。');
    }
    ids.add(e.id);
    return e;
  });
}

export function mergeEntries(entries: FinanceEntry[]): FinanceEntry {
  if (entries.length < 2) throw new Error('至少选择两条通知。');
  const first = entries[0];
  if (entries.some(e => e.amountCents !== first.amountCents || e.date !== first.date || e.direction !== first.direction)) {
    throw new Error('金额、日期和收支方向一致的通知才可合并；请先核对。');
  }
  return { ...first, title: entries.map(e => e.title).join(' / '),
    evidenceOnly: entries.every(e => e.evidenceOnly === true),
    paymentDateReviewRequired: !entries.some(e => !e.evidenceOnly && e.occurredAt) && entries.some(e => e.paymentDateReviewRequired === true),
    occurredAt: entries.find(e => !e.evidenceOnly && e.occurredAt)?.occurredAt ?? first.occurredAt,
    merchant: entries.find(e => e.merchant)?.merchant ?? '',
    identityKeys: [...new Set(entries.flatMap(e => e.identityKeys))],
    sources: entries.flatMap(e => e.sources),
    reviewReasons: [...new Set(entries.flatMap(e => e.reviewReasons))] };
}

export function possibleDuplicates(entry: FinanceEntry, entries: FinanceEntry[]): FinanceEntry[] {
  return entries.filter(e => e.id !== entry.id && e.provider !== entry.provider &&
    e.amountCents !== null && e.amountCents === entry.amountCents && e.date === entry.date && e.direction === entry.direction);
}

export async function fetchFinanceHistory() {
  const db = requireSupabase();
  async function posts() {
    const all: FinancePosting[] = [];
    for (let offset = 0; ; offset += 1000) {
      const {data, error} = await db.from('finance_postings').select('*').order('id').range(offset,offset+999);
      if (error) throw error;
      all.push(...data);
      if (data.length < 1000) return all;
    }
  }
  async function keys() {
    const all: {identity_key: string; posting_id: string}[] = [];
    for (let offset = 0; ; offset += 1000) {
      const {data, error} = await db.from('finance_keys').select('identity_key,posting_id').order('identity_key').range(offset,offset+999);
      if (error) throw error;
      all.push(...data);
      if (data.length < 1000) return all;
    }
  }
  const [postings, identities] = await Promise.all([posts(), keys()]);
  return {postings, keys: identities};
}

export async function bookFinance(entries: Booking[]) {
  const { data, error } = await requireSupabase().rpc('import_finance_batch', { p_entries: entries as unknown as Json });
  if (error) throw new Error(error.message);
  return data as { added: number; duplicates: number };
}
