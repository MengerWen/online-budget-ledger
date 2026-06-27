import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthPage } from "./components/AuthPage";
import { BudgetPlanManager } from "./components/BudgetPlanManager";
import { CalendarMonth } from "./components/CalendarMonth";
import { Dashboard } from "./components/Dashboard";
import { DayDetailPanel } from "./components/DayDetailPanel";
import { ImportExportPanel } from "./components/ImportExportPanel";
import { MonthlyStats } from "./components/MonthlyStats";
import { NetworkStatusBanner } from "./components/NetworkStatusBanner";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { createBudget, deleteBudget, fetchBudgets, initializeDefaultBudgets, setDefaultBudget, updateBudget } from "./services/budgetService";
import { readCachedData, saveCachedData } from "./services/cacheService";
import { fetchDayRecords, upsertDayRecord } from "./services/dayRecordService";
import { createExtraExpense, deleteExtraExpense, fetchExtraExpenses } from "./services/extraExpenseService";
import { ensureSettings, fetchSettings } from "./services/settingsService";
import type { AppData, AppSettings, BudgetPlan, DayRecord, ExtraExpense } from "./types";
import { calculateAllBudgetsStatus, calculateDayTotal, getDefaultBudget } from "./utils/budgetCalculations";
import { formatChineseDate, getTodayInLocalTimezone, parseLocalDate, toDateKey } from "./utils/dateUtils";
import { signOut } from "./services/authService";
import "./styles/globals.css";

const emptyData: AppData = { budgets: [], dayRecords: [], extraExpenses: [], settings: null };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<AppData>(emptyData);
  const [selectedDateKey, setSelectedDateKey] = useState(getTodayInLocalTimezone());
  const [displayedMonth, setDisplayedMonth] = useState(() => parseLocalDate(getTodayInLocalTimezone()));
  const [calendarBudgetId, setCalendarBudgetId] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [cacheWarning, setCacheWarning] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const detailRef = useRef<HTMLElement>(null);

  const selectedDate = useMemo(() => parseLocalDate(selectedDateKey), [selectedDateKey]);
  const selectedDayRecord = data.dayRecords.find((record) => record.date === selectedDateKey);
  const selectedDayExpenses = data.extraExpenses.filter((expense) => expense.date === selectedDateKey);
  const defaultBudget = getDefaultBudget(data.budgets, data.settings?.defaultBudgetId);
  const defaultBudgetId = defaultBudget?.id ?? null;

  const budgetStatuses = useMemo(
    () => calculateAllBudgetsStatus({ budgets: data.budgets, dayRecords: data.dayRecords, extraExpenses: data.extraExpenses, selectedDate }),
    [data.budgets, data.dayRecords, data.extraExpenses, selectedDate]
  );

  const todayTotal = useMemo(() => {
    const todayKey = getTodayInLocalTimezone();
    return calculateDayTotal(
      data.dayRecords.find((record) => record.date === todayKey),
      data.extraExpenses.filter((expense) => expense.date === todayKey)
    ).total;
  }, [data.dayRecords, data.extraExpenses]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: authData }) => {
      setSession(authData.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setData(emptyData);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;
    void loadUserData(session.user.id);
  }, [session?.user.id]);

  async function loadUserData(userId: string) {
    setLoading(true);
    setCacheWarning(null);
    const cached = readCachedData(userId);
    if (cached) {
      setData(cached.data);
    }

    const [budgetResult, dayResult, extraResult, settingsResult] = await Promise.all([
      fetchBudgets(userId),
      fetchDayRecords(userId),
      fetchExtraExpenses(userId),
      fetchSettings(userId)
    ]);

    if (budgetResult.error || dayResult.error || extraResult.error || settingsResult.error) {
      setCacheWarning(cached ? `云端刷新失败，当前显示 ${new Date(cached.savedAt).toLocaleString()} 的本地缓存。` : "读取失败，请检查 Supabase 配置和网络。");
      setLoading(false);
      return;
    }

    let budgets = budgetResult.data ?? [];
    if (budgets.length === 0) {
      const initialized = await initializeDefaultBudgets(userId);
      if (initialized.error) {
        setToast(initialized.error);
      } else {
        budgets = initialized.data ?? [];
      }
    }

    const settings = settingsResult.data ?? (await ensureSettings(userId, budgets.find((budget) => budget.isDefault)?.id ?? budgets[0]?.id ?? null)).data;
    const nextData: AppData = {
      budgets,
      dayRecords: dayResult.data ?? [],
      extraExpenses: extraResult.data ?? [],
      settings
    };
    setData(nextData);
    saveCachedData(userId, nextData);
    setLoading(false);
  }

  function getStatusesForDate(date: Date) {
    return calculateAllBudgetsStatus({ budgets: data.budgets, dayRecords: data.dayRecords, extraExpenses: data.extraExpenses, selectedDate: date });
  }

  function ensureCanSave() {
    if (!isOnline) {
      setToast("离线状态下不能保存，请联网后重试。");
      return false;
    }
    return true;
  }

  async function handleCreateBudget(name: string, monthlyAmount: number) {
    if (!session?.user.id || !ensureCanSave()) return;
    const result = await createBudget(session.user.id, name, monthlyAmount);
    if (result.error || !result.data) {
      setToast(`保存失败：${result.error}`);
      return;
    }
    const created = result.data;
    setData((current) => ({ ...current, budgets: [...current.budgets, created].sort((a, b) => a.monthlyAmount - b.monthlyAmount) }));
  }

  async function handleUpdateBudget(id: string, name: string, monthlyAmount: number) {
    if (!ensureCanSave()) return;
    const previous = data.budgets;
    setData((current) => ({ ...current, budgets: current.budgets.map((budget) => (budget.id === id ? { ...budget, name, monthlyAmount } : budget)) }));
    const result = await updateBudget(id, { name, monthlyAmount });
    if (result.error) {
      setData((current) => ({ ...current, budgets: previous }));
      setToast(`保存失败：${result.error}`);
    }
  }

  async function handleDeleteBudget(id: string) {
    if (!session?.user.id || !ensureCanSave()) return;
    if (data.budgets.length <= 1) {
      setToast("至少保留一档预算，无法删除。");
      return;
    }
    const previous = data.budgets;
    const remaining = data.budgets.filter((budget) => budget.id !== id);
    const nextDefault = defaultBudgetId === id ? remaining[0] : defaultBudget;
    setData((current) => ({
      ...current,
      budgets: remaining.map((budget) => ({ ...budget, isDefault: budget.id === nextDefault?.id })),
      settings: current.settings ? { ...current.settings, defaultBudgetId: nextDefault?.id ?? null } : current.settings
    }));
    const result = await deleteBudget(id);
    if (result.error) {
      setData((current) => ({ ...current, budgets: previous }));
      setToast(`删除失败：${result.error}`);
      return;
    }
    if (nextDefault?.id) await setDefaultBudget(session.user.id, nextDefault.id);
  }

  async function handleSetDefaultBudget(budgetId: string) {
    if (!session?.user.id || !ensureCanSave()) return;
    const previous = data;
    setData((current) => ({
      ...current,
      budgets: current.budgets.map((budget) => ({ ...budget, isDefault: budget.id === budgetId })),
      settings: current.settings ? { ...current.settings, defaultBudgetId: budgetId } : current.settings
    }));
    const result = await setDefaultBudget(session.user.id, budgetId);
    if (result.error) {
      setData(previous);
      setToast(`保存失败：${result.error}`);
    }
  }

  async function handleSaveDayRecord(
    values: Pick<DayRecord, "date" | "breakfast" | "lunch" | "dinner" | "breakfastNote" | "lunchNote" | "dinnerNote" | "note">
  ) {
    if (!session?.user.id || !ensureCanSave()) return;
    const previous = data.dayRecords;
    const optimistic: DayRecord = {
      id: selectedDayRecord?.id ?? `temp-${crypto.randomUUID()}`,
      user_id: session.user.id,
      createdAt: selectedDayRecord?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...values
    };
    setData((current) => ({
      ...current,
      dayRecords: [...current.dayRecords.filter((record) => record.date !== values.date), optimistic].sort((a, b) => a.date.localeCompare(b.date))
    }));
    const result = await upsertDayRecord(session.user.id, values);
    if (result.error || !result.data) {
      setData((current) => ({ ...current, dayRecords: previous }));
      setToast(`保存失败：${result.error}`);
      return;
    }
    const saved = result.data;
    setData((current) => ({ ...current, dayRecords: [...current.dayRecords.filter((record) => record.date !== values.date), saved] }));
  }

  async function handleCreateExpense(values: Pick<ExtraExpense, "date" | "amount" | "category" | "note">) {
    if (!session?.user.id || !ensureCanSave()) return;
    const previous = data.extraExpenses;
    const optimistic: ExtraExpense = {
      id: `temp-${crypto.randomUUID()}`,
      user_id: session.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...values
    };
    setData((current) => ({ ...current, extraExpenses: [...current.extraExpenses, optimistic] }));
    const result = await createExtraExpense(session.user.id, values);
    if (result.error || !result.data) {
      setData((current) => ({ ...current, extraExpenses: previous }));
      setToast(`保存失败：${result.error}`);
      return;
    }
    const saved = result.data;
    setData((current) => ({ ...current, extraExpenses: current.extraExpenses.map((expense) => (expense.id === optimistic.id ? saved : expense)) }));
  }

  async function handleDeleteExpense(id: string) {
    if (!ensureCanSave()) return;
    const previous = data.extraExpenses;
    setData((current) => ({ ...current, extraExpenses: current.extraExpenses.filter((expense) => expense.id !== id) }));
    const result = await deleteExtraExpense(id);
    if (result.error) {
      setData((current) => ({ ...current, extraExpenses: previous }));
      setToast(`删除失败：${result.error}`);
    }
  }

  async function handleImport(payload: Pick<AppData, "budgets" | "dayRecords" | "extraExpenses">) {
    if (!session?.user.id || !ensureCanSave()) return;
    for (const budget of payload.budgets) {
      await createBudget(session.user.id, budget.name, budget.monthlyAmount);
    }
    for (const record of payload.dayRecords) {
      await upsertDayRecord(session.user.id, {
        date: record.date,
        breakfast: record.breakfast,
        lunch: record.lunch,
        dinner: record.dinner,
        breakfastNote: record.breakfastNote ?? null,
        lunchNote: record.lunchNote ?? null,
        dinnerNote: record.dinnerNote ?? null,
        note: record.note
      });
    }
    for (const expense of payload.extraExpenses) {
      await createExtraExpense(session.user.id, {
        date: expense.date,
        amount: expense.amount,
        category: expense.category,
        note: expense.note
      });
    }
    await loadUserData(session.user.id);
  }

  function handleSelectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setDisplayedMonth(parseLocalDate(dateKey));
    if (window.innerWidth < 860) {
      window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  if (loading) {
    return <div className="loading-screen">正在加载记账数据</div>;
  }

  if (!session || !isSupabaseConfigured) {
    return <AuthPage />;
  }

  if (data.budgets.length === 0) {
    return (
      <main className="app-shell">
        <NetworkStatusBanner isOnline={isOnline} cacheWarning={cacheWarning} />
        <section className="section-block">
          <h1>还没有预算档位</h1>
          <p>请先创建至少一档生活费预算。</p>
          <BudgetPlanManager budgets={data.budgets} onCreate={handleCreateBudget} onUpdate={handleUpdateBudget} onDelete={handleDeleteBudget} />
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <NetworkStatusBanner isOnline={isOnline} cacheWarning={cacheWarning} />
      {toast && (
        <button className="toast" type="button" onClick={() => setToast(null)}>
          {toast}
        </button>
      )}
      <Dashboard
        email={session.user.email ?? "已登录用户"}
        currentMonth={formatChineseDate(displayedMonth).replace(/\d+日.*/, "")}
        todayTotal={todayTotal}
        budgets={data.budgets}
        statuses={budgetStatuses}
        defaultBudgetId={defaultBudgetId}
        onSetDefault={handleSetDefaultBudget}
        onSignOut={handleSignOut}
      />
      <div className="main-layout">
        <div className="left-column">
          <BudgetPlanManager budgets={data.budgets} onCreate={handleCreateBudget} onUpdate={handleUpdateBudget} onDelete={handleDeleteBudget} />
          <CalendarMonth
            displayedMonth={displayedMonth}
            selectedDateKey={selectedDateKey}
            budgets={data.budgets}
            dayRecords={data.dayRecords}
            extraExpenses={data.extraExpenses}
            calendarBudgetId={calendarBudgetId}
            onCalendarBudgetChange={setCalendarBudgetId}
            getStatusesForDate={getStatusesForDate}
            onChangeMonth={setDisplayedMonth}
            onSelectDate={handleSelectDate}
          />
        </div>
        <div className="right-column">
          <DayDetailPanel
            detailRef={detailRef}
            selectedDateKey={selectedDateKey}
            dayRecord={selectedDayRecord}
            expenses={selectedDayExpenses}
            budgets={data.budgets}
            statuses={budgetStatuses}
            onSaveDayRecord={handleSaveDayRecord}
            onCreateExpense={handleCreateExpense}
            onDeleteExpense={handleDeleteExpense}
          />
          <MonthlyStats displayedMonth={displayedMonth} budgets={data.budgets} dayRecords={data.dayRecords} extraExpenses={data.extraExpenses} />
          <ImportExportPanel data={data} selectedDateKey={selectedDateKey} displayedMonth={displayedMonth} onImport={handleImport} />
        </div>
      </div>
    </main>
  );
}
