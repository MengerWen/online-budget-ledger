import { Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import type { BudgetPlan } from "../types";
import { parseMoneyInput, validateBudgetAmount } from "../utils/validation";

type Props = {
  budgets: BudgetPlan[];
  onCreate: (name: string, monthlyAmount: number) => Promise<void>;
  onUpdate: (id: string, name: string, monthlyAmount: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function BudgetPlanManager({ budgets, onCreate, onUpdate, onDelete }: Props) {
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseMoneyInput(newAmount);
    const budgetError = validateBudgetAmount(parsed.value);
    if (parsed.error || budgetError) {
      setError(parsed.error ?? budgetError);
      return;
    }
    await onCreate(newName || `${parsed.value} 档`, parsed.value!);
    setNewName("");
    setNewAmount("");
    setError(null);
  }

  return (
    <section className="section-block">
      <div className="section-title">
        <h2>预算管理</h2>
        <span>{budgets.length} 档</span>
      </div>
      <form className="inline-form" onSubmit={handleCreate}>
        <input value={newName} placeholder="预算名称" onChange={(event) => setNewName(event.target.value)} />
        <input value={newAmount} placeholder="月预算金额" inputMode="decimal" onChange={(event) => setNewAmount(event.target.value)} />
        <button className="primary-button" type="submit">
          <Plus size={17} />
          新增
        </button>
      </form>
      {error && <p className="field-error">{error}</p>}
      <div className="budget-edit-list">
        {budgets.map((budget) => (
          <BudgetEditRow
            key={budget.id}
            budget={budget}
            canDelete={budgets.length > 1}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

function BudgetEditRow({
  budget,
  canDelete,
  onUpdate,
  onDelete
}: {
  budget: BudgetPlan;
  canDelete: boolean;
  onUpdate: (id: string, name: string, monthlyAmount: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(budget.name);
  const [amount, setAmount] = useState(String(budget.monthlyAmount));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const parsed = parseMoneyInput(amount);
    const budgetError = validateBudgetAmount(parsed.value);
    if (parsed.error || budgetError) {
      setError(parsed.error ?? budgetError);
      return;
    }
    await onUpdate(budget.id, name, parsed.value!);
    setError(null);
  }

  async function remove() {
    if (!canDelete) {
      setError("至少保留一档预算，无法删除");
      return;
    }
    if (window.confirm(`确认删除 ${budget.name}？`)) {
      await onDelete(budget.id);
    }
  }

  return (
    <div className="edit-row">
      <input value={name} onChange={(event) => setName(event.target.value)} aria-label="预算名称" />
      <input value={amount} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} aria-label="预算金额" />
      <button className="icon-button" type="button" onClick={save} title="保存预算" aria-label="保存预算">
        <Save size={17} />
      </button>
      <button className="icon-button danger" type="button" onClick={remove} disabled={!canDelete} title="删除预算" aria-label="删除预算">
        <Trash2 size={17} />
      </button>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
