import { LogOut } from "lucide-react";
import type { BudgetPlan, BudgetStatus } from "../types";
import { formatCurrency } from "../utils/format";
import { BudgetPlanCard } from "./BudgetPlanCard";

type Props = {
  email: string;
  currentMonth: string;
  todayTotal: number;
  budgets: BudgetPlan[];
  statuses: Map<string, BudgetStatus>;
  defaultBudgetId: string | null;
  view: "ledger" | "stats";
  onChangeView: (view: "ledger" | "stats") => void;
  onSetDefault: (budgetId: string) => void;
  onSignOut: () => void;
};

export function Dashboard({ email, currentMonth, todayTotal, budgets, statuses, defaultBudgetId, view, onChangeView, onSetDefault, onSignOut }: Props) {
  const defaultBudget = budgets.find((budget) => budget.id === defaultBudgetId) ?? budgets[0];
  const defaultStatus = defaultBudget ? statuses.get(defaultBudget.id) : undefined;
  const todayRemaining = defaultStatus?.selectedDayDiff ?? 0;

  return (
    <section className="dashboard-band">
      <div className="topbar">
        <div className="brand-lockup">
          <span className="app-mark" aria-hidden="true">账</span>
          <div>
            <p className="eyebrow">生活费预算记账</p>
            <h1>{currentMonth}<span>今天的生活费进度</span></h1>
          </div>
        </div>
        <div className="topbar-actions">
          <nav className="view-tabs" aria-label="视图切换">
            <button className={view === "ledger" ? "active" : ""} type="button" onClick={() => onChangeView("ledger")}>
              记账
            </button>
            <button className={view === "stats" ? "active" : ""} type="button" onClick={() => onChangeView("stats")}>
              统计
            </button>
          </nav>
          <div className="user-cluster">
            <span>{email}</span>
            <button className="icon-button" type="button" onClick={onSignOut} title="退出登录" aria-label="退出登录">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="decision-grid">
        <article className="today-decision">
          <div>
            <p className="decision-label">{defaultBudget?.name ?? "默认预算"} · 今天还可以花</p>
            <strong className={todayRemaining < 0 ? "negative" : ""}>
              {todayRemaining < 0 ? `-${formatCurrency(Math.abs(todayRemaining))}` : formatCurrency(todayRemaining)}
            </strong>
            <p className="decision-context">
              今天已记录 {formatCurrency(todayTotal)}
              <span aria-hidden="true"> / </span>
              动态额度 {formatCurrency(defaultStatus?.dynamicDailyAllowance ?? 0)}
            </p>
          </div>
          <div className="decision-foot">
            <span>本月已花 <b>{formatCurrency(defaultStatus?.monthSpentToDate ?? 0)}</b></span>
            <span>本月剩余 <b>{formatCurrency(defaultStatus?.remainingMonthBalance ?? 0)}</b></span>
          </div>
        </article>
        <section className="budget-stage" aria-label="所有预算档位">
          <div className="budget-stage-header">
            <div>
              <p className="eyebrow">多档预算对照</p>
              <h2>三个生活标准，同一笔账</h2>
            </div>
            <span>今日实时计算</span>
          </div>
          <div className="budget-scroll">
            {budgets.map((budget) => (
              <BudgetPlanCard
                key={budget.id}
                budget={budget}
                status={statuses.get(budget.id)}
                isDefault={budget.id === defaultBudgetId}
                onSetDefault={onSetDefault}
              />
            ))}
          </div>
        </section>
      </div>
      {budgets.length > 5 && <p className="scroll-hint">左右滑动查看全部预算档位</p>}
    </section>
  );
}
