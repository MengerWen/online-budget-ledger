import type { BudgetPlan, BudgetStatus } from "../types";
import { diffClass, formatCurrency, formatSignedDiff } from "../utils/format";

type Props = {
  budget: BudgetPlan;
  status: BudgetStatus | undefined;
  isDefault: boolean;
  onSetDefault: (budgetId: string) => void;
};

export function BudgetPlanCard({ budget, status, isDefault, onSetDefault }: Props) {
  const usage = Math.min((status?.usageRate ?? 0) * 100, 140);
  const usageLevel = usage > 100 ? "danger" : usage >= 80 ? "warning" : "safe";

  return (
    <article className={`budget-card ${isDefault ? "default" : ""}`}>
      <div className="budget-card-header">
        <div>
          <p className="eyebrow">{isDefault ? "默认预算" : "预算档位"}</p>
          <h3>{budget.name}</h3>
        </div>
        <button className="small-button" type="button" disabled={isDefault} onClick={() => onSetDefault(budget.id)}>
          设默认
        </button>
      </div>
      <div className="metric-grid">
        <Metric label="月预算" value={formatCurrency(budget.monthlyAmount)} />
        <Metric label="日均预算" value={formatCurrency(status?.fixedDailyAllowance ?? 0)} />
        <Metric label="本月至今已花" value={formatCurrency(status?.monthSpentToDate ?? 0)} />
        <Metric
          label="本月至今"
          value={status ? formatSignedDiff(status.diffToDate) : "待计算"}
          tone={status ? diffClass(status.diffToDate) : "neutral"}
        />
        <Metric
          label="本月剩余"
          value={status ? (status.remainingMonthBalance >= 0 ? formatCurrency(status.remainingMonthBalance) : `已超支 ${formatCurrency(Math.abs(status.remainingMonthBalance))}`) : "待计算"}
          tone={status ? diffClass(status.remainingMonthBalance) : "neutral"}
        />
        <Metric
          label="剩余日均可花"
          value={status && status.remainingDailyAllowance < 0 ? "之后即使不花也已超支" : formatCurrency(status?.remainingDailyAllowance ?? 0)}
          tone={status ? diffClass(status.remainingDailyAllowance) : "neutral"}
        />
      </div>
      <div className="progress-row">
        <span>使用率 {Math.round((status?.usageRate ?? 0) * 100)}%</span>
        <div className="progress-track">
          <span className={`progress-fill ${usageLevel}`} style={{ width: `${usage}%` }} />
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "positive" | "negative" | "neutral" }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}
