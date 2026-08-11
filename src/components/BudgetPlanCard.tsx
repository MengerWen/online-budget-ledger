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
          <h3>{budget.name}</h3>
          <p className="budget-monthly">月预算 {formatCurrency(budget.monthlyAmount)}</p>
        </div>
        <button className="small-button" type="button" disabled={isDefault} onClick={() => onSetDefault(budget.id)}>
          {isDefault ? "默认" : "设默认"}
        </button>
      </div>
      <div className="budget-card-primary">
        <strong className={status ? diffClass(status.remainingDailyAllowance) : "neutral"}>
          {status && status.remainingDailyAllowance < 0 ? "已超支" : formatCurrency(status?.remainingDailyAllowance ?? 0)}
        </strong>
        <span>之后每天可花</span>
      </div>
      <div className="metric-grid">
        <Metric label="本月至今已花" value={formatCurrency(status?.monthSpentToDate ?? 0)} />
        <Metric
          label="进度差额"
          value={status ? formatSignedDiff(status.diffToDate) : "待计算"}
          tone={status ? diffClass(status.diffToDate) : "neutral"}
        />
        <Metric
          label="本月剩余"
          value={status ? (status.remainingMonthBalance >= 0 ? formatCurrency(status.remainingMonthBalance) : `已超支 ${formatCurrency(Math.abs(status.remainingMonthBalance))}`) : "待计算"}
          tone={status ? diffClass(status.remainingMonthBalance) : "neutral"}
        />
        <Metric label="固定日均" value={formatCurrency(status?.fixedDailyAllowance ?? 0)} />
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
