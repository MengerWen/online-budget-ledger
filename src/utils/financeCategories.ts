import { EXTRA_EXPENSE_CATEGORIES } from './extraCategories';

export const MEAL_CATEGORIES = ["早餐", "午餐", "晚餐"] as const;
export const FINANCE_CATEGORIES = [...MEAL_CATEGORIES, ...EXTRA_EXPENSE_CATEGORIES] as const;

export function financeTarget(category: string, direction: string): string {
  const meal = ({ 早餐: 'breakfast', 午餐: 'lunch', 晚餐: 'dinner' } as Record<string, string>)[category];
  return direction === 'expense' && meal ? meal : `extra:${category}`;
}
