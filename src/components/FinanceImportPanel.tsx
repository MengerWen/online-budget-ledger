import { useEffect, useRef, useState } from 'react';
import type { AppData } from '../types';
import { EXTRA_EXPENSE_CATEGORIES } from '../utils/extraCategories';
import { bookFinance, fetchFinanceHistory, mergeEntries, parseFinanceFile, possibleDuplicates } from '../services/financeImportService';
import type { Booking, FinanceEntry, FinancePosting } from '../services/financeImportService';
import { connectLocalFinanceFeed, restoreLocalFinanceFeed } from '../services/localFinanceFeed';

export function FinanceImportPanel({ data, onImported }: { data: AppData; onImported: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [refunds, setRefunds] = useState<Record<string, string>>({});
  const [dateConfirmations, setDateConfirmations] = useState<Record<string, string>>({});
  const [postings, setPostings] = useState<FinancePosting[]>([]);
  const [known, setKnown] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [page, setPage] = useState(0);
  const [feedConnected, setFeedConnected] = useState(false);
  const [feedChanged, setFeedChanged] = useState(false);
  const feed = useRef<Awaited<ReturnType<typeof connectLocalFinanceFeed>>>();
  const feedText = useRef('');
  const workInProgress = useRef(false);
  workInProgress.current = busy || selected.size > 0 || Object.keys(targets).length > 0;
  async function history() {
    const result = await fetchFinanceHistory();
    setPostings(result.postings);
    setKnown(Object.fromEntries(result.keys.map(k => [k.identity_key, k.posting_id])));
    setHistoryReady(true);
  }
  useEffect(() => { void history().catch(e => setMessage(`无法核对已有流水：${e.message}`)); }, []);
  useEffect(() => {
    let active = true;
    void restoreLocalFinanceFeed().then(async handle => {
      if (!active || !handle) return;
      feed.current = handle;setFeedConnected(true);await readFeed();
    }).catch(e => { if (active) setMessage((e as Error).message); });
    const check = () => { if (feed.current && !document.hidden) void readFeed(); };
    const timer = window.setInterval(check, 3600000);
    window.addEventListener('focus', check);
    return () => { active = false;window.clearInterval(timer);window.removeEventListener('focus', check); };
  }, []);
  async function readFeed(force = false) {
    try {
      if (!feed.current) return;
      const file = await feed.current.getFile();
      if (file.size > 20 * 1024 * 1024) throw new Error('财务文件超过 20 MiB。');
      const text = await file.text();
      const parsed = parseFinanceFile(text);
      const signature = JSON.stringify(parsed);
      if (signature === feedText.current) return;
      if (!force && workInProgress.current) { setFeedChanged(true);setMessage('本地财务证据已更新，请重新读取后继续核对。');return; }
      await history();setEntries(parsed);setSelected(new Set());setTargets({});setDateConfirmations({});setPage(0);setFeedChanged(false);feedText.current = signature;
      setMessage(`已自动读取 ${parsed.length} 条财务记录。分类建议待确认，尚未入账。`);
    } catch(e) { setMessage(`自动读取未完成：${(e as Error).message}`); }
  }
  async function connectFeed() {
    try { feed.current = await connectLocalFinanceFeed();setFeedConnected(true);await readFeed(true); }
    catch(e) { setMessage((e as Error).message); }
  }
  function isKnown(e: FinanceEntry) { return e.identityKeys.some(k => known[k]); }
  function eligible(e: FinanceEntry) { return e.currency === 'CNY' && e.amountCents !== null && e.amountCents > 0 && ['expense','refund'].includes(e.direction) && e.status === 'succeeded' && !isKnown(e); }
  async function load(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('文件超过 20 MiB。');
      const items = parseFinanceFile(await file.text());
      await history(); setEntries(items);setSelected(new Set());setTargets({});setDateConfirmations({});setPage(0);
      setMessage(`已读取 ${items.length} 条。请核对日期、重复通知及已手工记录的支出，再选择入账。`);
    } catch (e) { setMessage((e as Error).message); }
  }
  function toggle(id: string) { setSelected(old => { const next = new Set(old);if (next.has(id)) next.delete(id);else next.add(id);return next; }); }
  function merge() {
    try {
      const group = entries.filter(e => selected.has(e.id)); const combined = mergeEntries(group);
      setEntries(old => [combined, ...old.filter(e => !selected.has(e.id))]);setSelected(new Set([combined.id]));setPage(0);
      setDateConfirmations({});
      setMessage('已合并来源。请再核对入账类别。');
    } catch(e) { setMessage((e as Error).message); }
  }
  async function commit() {
    setBusy(true);
    let saved: {added:number;duplicates:number} | undefined;
    try {
      if (!navigator.onLine || !historyReady) throw new Error('联网并取得已有流水后才能入账。');
      if (feedChanged) throw new Error('交易证据已更新，请先重新读取再核对。');
      const chosen = entries.filter(e => selected.has(e.id));
      if (!chosen.length || chosen.some(e => !eligible(e))) throw new Error('请只选择金额和成功状态明确的支出或退款。');
      const bookings: Booking[] = chosen.map(e => {
        if (e.paymentDateReviewRequired && dateConfirmations[e.id] !== e.date) throw new Error('请核对实付款的实际扣款日期，并勾选日期确认。');
        const reviewed = { ...e, ...(e.paymentDateReviewRequired ? {paymentDateConfirmedFor:e.date} : {}) };
        const target = targets[e.id]; if (!target) throw new Error('每条选中流水都需要选择入账方式。');
        if (e.evidenceOnly && !target.startsWith('link:') && !target.startsWith('manual:')) throw new Error('订单列表只可关联已经记录的实际支出；或先与扣款通知合并。');
        if (e.direction === 'refund' && !refunds[e.id]) throw new Error('退款需要关联已入账的原支出。');
        if (target.startsWith('link:')) return { ...reviewed, target: 'existing', linkTo: target.slice(5) };
        if (target.startsWith('manual:')) return { ...reviewed, target: 'existing', existingExpenseId: target.slice(7) };
        return { ...reviewed, target: target.startsWith('extra:') ? 'extra' : target,
          category: target.startsWith('extra:') ? target.slice(6) : '餐饮', refundOf: refunds[e.id] };
      });
      const result = await bookFinance(bookings); saved=result;
      setSelected(new Set());
      await history(); await onImported();
      setMessage(`入账 ${result.added} 条，已有流水 ${result.duplicates} 条。`);
    } catch(e) {
      if (saved) {setHistoryReady(false);setMessage(`已保存 ${saved.added} 条、已有 ${saved.duplicates} 条，但刷新失败：${(e as Error).message}。请重新选择文件核对。`);}
      else setMessage(`未完成入账：${(e as Error).message}`);
    }
    finally { setBusy(false); }
  }
  const visible = entries.slice(page * 25, (page + 1) * 25);
  return <section className="section-block finance-panel">
    <div className="section-title"><h2>支付与订单导入</h2><span>微信 · 银行 · 购物订单</span></div>
    <p>读取 Dating 导出的“记账待核对.json”。银行与支付通知可能对应同一笔钱；相同金额只提示核对。物流、促销和字段不全的通知保留供查看。</p>
    <div className="backup-actions">
      <button className="secondary-button" disabled={busy} onClick={() => void connectFeed()}>{feedConnected ? '更换同步文件' : '连接本地每小时文件'}</button>
      {feedConnected && <button className="secondary-button" disabled={busy} onClick={() => void readFeed(true)}>重新读取同步文件</button>}
      <button className="secondary-button" disabled={busy} onClick={() => input.current?.click()}>选择财务文件</button>
      <button className="secondary-button" disabled={busy || selected.size < 2} onClick={merge}>合并选中的重复通知</button>
      <button className="primary-button" disabled={busy || !historyReady || !selected.size} onClick={() => void commit()}>核对完成，入账 {selected.size} 条</button>
      <input ref={input} type="file" accept=".json,application/json" hidden onChange={e => { void load(e.target.files?.[0]);e.target.value=''; }} />
    </div>
    <p role="status">{message}</p>
    {feedConnected && <p>已连接本地财务文件：此页打开时每小时读取，回到页面也会检查。关闭页面期间 Dating 继续更新文件；入账仍由你确认。</p>}
    {visible.map(e => <article className="finance-entry" key={e.id}>
      <label><input type="checkbox" checked={selected.has(e.id)} disabled={busy || !eligible(e)} onChange={() => toggle(e.id)} /> {e.sourceName} · {e.title} · {e.amountCents === null ? '金额缺失' : `¥${(e.amountCents / 100).toFixed(2)}`} {isKnown(e) ? '（已入账）' : ''}</label>
      <div>{e.merchant || '商户未提供'} · {({expense:'支出',refund:'退款',income:'收入',transfer:'资金转移',unknown:'收支待核对'} as Record<string,string>)[e.direction] ?? e.direction} · {({succeeded:'已完成',info:'仅供查看',review:'状态待核对'} as Record<string,string>)[e.status] ?? e.status}</div>
      <label>记账日期 <input type="date" value={e.date} disabled={isKnown(e) || busy} onChange={event => { setDateConfirmations(old => ({...old,[e.id]:''}));setEntries(old => old.map(item => item.id === e.id ? {...item,date:event.target.value} : item)); }} /></label>
      <div>{e.occurredAt ? `交易时间 ${e.occurredAt}` : e.orderedAt ? `采集时间 ${e.receivedAt}；支付时间未提供` : `仅有通知时间 ${e.receivedAt}`}</div>
      {e.orderedAt && <div>下单时间 {e.orderedAt} · {e.paymentMethod || '支付方式未提供'}</div>}
      {!!e.reviewReasons.length && <p>{e.reviewReasons.join('；')}</p>}
      {e.aiSuggestion && <p>AI 建议：{e.aiSuggestion.category}。{e.aiSuggestion.reason} {e.aiSuggestion.question}</p>}
      {e.reviewedBooking && <p>Dating 核对：{e.reviewedBooking.disposition === 'ignore' ? '已忽略' : e.reviewedBooking.category} · {e.reviewedBooking.date}。{e.reviewedBooking.explanation}</p>}
      {eligible(e) && !e.evidenceOnly && (e.reviewedBooking?.disposition === 'confirm' || e.aiSuggestion) && <button className="secondary-button" disabled={busy} onClick={() => {
        const reviewed = e.reviewedBooking?.disposition === 'confirm' ? e.reviewedBooking : null;
        setTargets(old => ({...old,[e.id]:`extra:${reviewed?.category || e.aiSuggestion?.category}`}));
        if (reviewed) { setEntries(old => old.map(item => item.id === e.id ? {...item,date:reviewed.date} : item));setDateConfirmations(old => ({...old,[e.id]:reviewed.dateConfirmed ? reviewed.date : ''})); }
      }}>采用{e.reviewedBooking?.disposition === 'confirm' ? '已核对分类和日期' : 'AI 分类建议'}</button>}
      {eligible(e) && e.paymentDateReviewRequired && <label><input type="checkbox" checked={dateConfirmations[e.id] === e.date} disabled={busy} onChange={event => setDateConfirmations(old => ({...old,[e.id]:event.target.checked ? e.date : ''}))} /> 已核对实际扣款日期：{e.date}</label>}
      {!!possibleDuplicates(e, entries).length && <p>同日、同额的其他来源：{possibleDuplicates(e, entries).map(x => x.sourceName).join('、')}。请核对是否同一笔。</p>}
      {eligible(e) && <label>入账方式 <select value={targets[e.id] ?? ''} disabled={busy} onChange={event => setTargets(old => ({...old,[e.id]:event.target.value}))}>
        <option value="">请选择，或不勾选这条</option>
        {!e.evidenceOnly && e.direction === 'expense' && <><option value="breakfast">计入早餐</option><option value="lunch">计入午餐</option><option value="dinner">计入晚餐</option></>}
        {!e.evidenceOnly && EXTRA_EXPENSE_CATEGORIES.map(c => <option key={c} value={`extra:${c}`}>{e.direction === 'refund' ? '退款冲减' : '额外支出'}：{c}</option>)}
        {e.direction === 'expense' && postings.filter(p => p.direction === 'expense' && p.date === e.date && p.amount_cents === e.amountCents).map(p => <option key={p.id} value={`link:${p.id}`}>关联同额已入账流水：{p.category}</option>)}
        {e.direction === 'expense' && data.extraExpenses.filter(x => x.date === e.date && Math.round(x.amount * 100) === e.amountCents).map(x => <option key={x.id} value={`manual:${x.id}`}>已手工记过：{x.category} {x.note}</option>)}
      </select></label>}
      {eligible(e) && e.evidenceOnly && <p>请把记账日期改为实际扣款日，再关联已有支出或合并扣款通知。</p>}
      {eligible(e) && e.direction === 'refund' && <label>原支出 <select value={refunds[e.id] ?? ''} onChange={event => setRefunds(old => ({...old,[e.id]:event.target.value}))}><option value="">请选择</option>{postings.filter(p => p.direction === 'expense').map(p => <option key={p.id} value={p.id}>{p.date} · {p.category} · ¥{(p.amount_cents/100).toFixed(2)}</option>)}</select></label>}
      <details><summary>查看来源</summary><pre>{JSON.stringify(e.sources,null,2)}</pre></details>
    </article>)}
    {entries.length > 25 && <div className="backup-actions"><button disabled={page === 0} onClick={() => setPage(p => p-1)}>上一页</button><span>{page+1} / {Math.ceil(entries.length/25)}</span><button disabled={(page+1)*25 >= entries.length} onClick={() => setPage(p => p+1)}>下一页</button></div>}
  </section>;
}
