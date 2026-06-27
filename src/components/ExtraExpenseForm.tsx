import { Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import type { ExtraExpense } from "../types";
import { EXTRA_EXPENSE_CATEGORIES } from "../utils/extraCategories";
import { parseMoneyInput } from "../utils/validation";

type Props = {
  selectedDateKey: string;
  onCreate: (values: Pick<ExtraExpense, "date" | "amount" | "category" | "note">) => Promise<void>;
};

export function ExtraExpenseForm({ selectedDateKey, onCreate }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("其他");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseMoneyInput(amount);
    if (parsed.error || parsed.value === null) {
      setError(parsed.error ?? "请输入额外花销金额");
      return;
    }
    await onCreate({ date: selectedDateKey, amount: parsed.value, category, note: note.trim() || null });
    setAmount("");
    setNote("");
    setError(null);
  }

  return (
    <form className="extra-form" onSubmit={handleSubmit}>
      <input value={amount} inputMode="decimal" placeholder="金额" onChange={(event) => setAmount(event.target.value)} />
      <select value={category} onChange={(event) => setCategory(event.target.value)}>
        {EXTRA_EXPENSE_CATEGORIES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <input value={note} placeholder="备注" onChange={(event) => setNote(event.target.value)} />
      <button className="primary-button" type="submit">
        <Plus size={17} />
        添加
      </button>
      {error && <span className="field-error">{error}</span>}
    </form>
  );
}
