import { Trash2 } from "lucide-react";
import type { ExtraExpense } from "../types";
import { formatCurrency } from "../utils/format";
import { ExtraExpenseForm } from "./ExtraExpenseForm";

type Props = {
  selectedDateKey: string;
  expenses: ExtraExpense[];
  onCreate: (values: Pick<ExtraExpense, "date" | "amount" | "category" | "note">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function ExtraExpenseList({ selectedDateKey, expenses, onCreate, onDelete }: Props) {
  return (
    <div className="extra-expenses">
      <div className="section-title compact">
        <h3>额外花销</h3>
        <span>{expenses.length} 条</span>
      </div>
      <ExtraExpenseForm selectedDateKey={selectedDateKey} onCreate={onCreate} />
      <div className="expense-list">
        {expenses.length === 0 && <p className="empty-text">这一天还没有额外花销。</p>}
        {expenses.map((expense) => (
          <div className="expense-row" key={expense.id}>
            <strong>{formatCurrency(expense.amount)}</strong>
            <span>{expense.category}</span>
            <small>{expense.note || "无备注"}</small>
            <button
              className="icon-button danger"
              type="button"
              onClick={() => {
                if (window.confirm("确认删除这条额外花销？")) void onDelete(expense.id);
              }}
              title="删除额外花销"
              aria-label="删除额外花销"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
