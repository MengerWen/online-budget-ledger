export type Currency = "CNY";

export type BudgetPlan = {
  id: string;
  user_id: string;
  name: string;
  monthlyAmount: number;
  currency: Currency;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DayRecord = {
  id: string;
  user_id: string;
  date: string;
  breakfast: number | null;
  lunch: number | null;
  dinner: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MealKey = "breakfast" | "lunch" | "dinner";

export type ExtraExpense = {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  category: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  user_id: string;
  defaultBudgetId: string | null;
  weekStartsOn: 1;
  mealWeights: Record<MealKey, number>;
  createdAt: string;
  updatedAt: string;
};

export type BudgetStatus = {
  budgetId: string;
  budgetName: string;
  monthlyAmount: number;
  daysInMonth: number;
  fixedDailyAllowance: number;
  fixedMealAllowance: number;
  dynamicDailyAllowance: number;
  dynamicMealAllowance: number;
  allowanceLabel: string;
  selectedDayTotal: number;
  selectedDayDiff: number;
  monthSpentToDate: number;
  monthBudgetToDate: number;
  diffToDate: number;
  remainingMonthBalance: number;
  remainingDailyAllowance: number;
  remainingMealAllowance: number;
  usageRate: number;
};

export type MealDiff = {
  status: "saved" | "overspent" | "even" | "empty";
  diff: number | null;
};

export type AppData = {
  budgets: BudgetPlan[];
  dayRecords: DayRecord[];
  extraExpenses: ExtraExpense[];
  settings: AppSettings | null;
};

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };
