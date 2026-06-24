import { Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { BudgetPlan, BudgetStatus, DayRecord, MealKey } from "../types";
import { calculateFixedMealAllowance, calculateMealDiff } from "../utils/budgetCalculations";
import { diffClass, formatCurrency, mealDiffText } from "../utils/format";
import { parseMoneyInput } from "../utils/validation";

const meals: { key: MealKey; label: string }[] = [
  { key: "breakfast", label: "早餐" },
  { key: "lunch", label: "午餐" },
  { key: "dinner", label: "晚餐" }
];

type Props = {
  dayRecord?: DayRecord;
  budgets: BudgetPlan[];
  statuses: Map<string, BudgetStatus>;
  selectedDateKey: string;
  onSave: (values: Pick<DayRecord, "date" | "breakfast" | "lunch" | "dinner" | "note">) => Promise<void>;
};

export function MealExpenseForm({ dayRecord, budgets, statuses, selectedDateKey, onSave }: Props) {
  const [values, setValues] = useState<Record<MealKey, string>>({ breakfast: "", lunch: "", dinner: "" });
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues({
      breakfast: dayRecord?.breakfast === null || dayRecord?.breakfast === undefined ? "" : String(dayRecord.breakfast),
      lunch: dayRecord?.lunch === null || dayRecord?.lunch === undefined ? "" : String(dayRecord.lunch),
      dinner: dayRecord?.dinner === null || dayRecord?.dinner === undefined ? "" : String(dayRecord.dinner)
    });
    setNote(dayRecord?.note ?? "");
  }, [dayRecord, selectedDateKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = meals.reduce<Record<MealKey, number | null>>((acc, meal) => {
      const result = parseMoneyInput(values[meal.key]);
      setErrors((current) => ({ ...current, [meal.key]: result.error }));
      acc[meal.key] = result.value;
      return acc;
    }, { breakfast: null, lunch: null, dinner: null });

    if (meals.some((meal) => parseMoneyInput(values[meal.key]).error)) return;

    setSaving(true);
    await onSave({ date: selectedDateKey, ...parsed, note: note || null });
    setSaving(false);
  }

  return (
    <form className="meal-form" onSubmit={handleSubmit}>
      {meals.map((meal) => (
        <div className="meal-row" key={meal.key}>
          <label>
            {meal.label}
            <input
              value={values[meal.key]}
              inputMode="decimal"
              placeholder="未记录"
              onChange={(event) => setValues((current) => ({ ...current, [meal.key]: event.target.value }))}
            />
          </label>
          {errors[meal.key] && <span className="field-error">{errors[meal.key]}</span>}
          <div className="meal-comparison">
            {budgets.map((budget) => {
              const status = statuses.get(budget.id);
              const actual = parseMoneyInput(values[meal.key]).value;
              const dynamicDiff = calculateMealDiff({ actual, mealAllowance: status?.dynamicMealAllowance ?? 0 });
              const fixedAllowance = calculateFixedMealAllowance(budget.monthlyAmount, status?.daysInMonth ?? 30, meal.key);
              return (
                <span key={budget.id}>
                  <b>{budget.name}</b>
                  动态 {formatCurrency(status?.dynamicMealAllowance ?? 0)}
                  <em className={dynamicDiff.diff === null ? "neutral" : diffClass(dynamicDiff.diff)}>{mealDiffText(dynamicDiff)}</em>
                  <small>固定 {formatCurrency(fixedAllowance)}</small>
                </span>
              );
            })}
          </div>
        </div>
      ))}
      <label className="note-label">
        日备注
        <textarea value={note} rows={2} onChange={(event) => setNote(event.target.value)} placeholder="例如：今天聚餐 / 今天没吃晚饭" />
      </label>
      <button className="primary-button" type="submit" disabled={saving}>
        <Save size={17} />
        {saving ? "保存中" : "保存三餐"}
      </button>
    </form>
  );
}
