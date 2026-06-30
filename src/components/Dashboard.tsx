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
  return (
    <section className="dashboard-band">
      <div className="topbar">
        <div>
          <p className="eyebrow">生活费预算记账</p>
          <h1>{currentMonth}</h1>
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
      <div className="today-absolute">
        <span>今日总花销</span>
        <strong>{formatCurrency(todayTotal)}</strong>
      </div>
      <div className="budget-scroll" aria-label="所有预算档位">
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
      {budgets.length > 5 && <p className="scroll-hint">左右滑动查看全部预算档位</p>}
    </section>
  );
}
