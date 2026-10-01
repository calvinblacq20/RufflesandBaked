import { EXPENSE_CATEGORIES, expenseCategory, expenseCategoryLabel } from "../data/expenses";
import type { Expense, Line, Order } from "../data/types";
import { dayKey } from "./format";
import type { Range } from "./metrics";

/* What the studio spends, and what is left. Revenue is money actually received, so profit here
   is cash in minus cash out over the same days — not accrual accounting. That matches how the
   owner thinks about a month: what landed, what went out, what is left. */

export const inRange = (on: string, range: Range) => on >= dayKey(range.start) && on < dayKey(range.end);

export const expensesIn = (expenses: Expense[], range: Range) => expenses.filter((e) => inRange(e.on, range));

export const totalSpend = (expenses: Expense[]) => expenses.reduce((sum, e) => sum + e.amount, 0);

export interface CategoryTotal {
  id: string;
  label: string;
  amount: number;
  /** Of the period's total spend, 0–1. 0 when nothing was spent at all. */
  share: number;
}

/** Spend per category, biggest first. Categories with nothing in the period are left out. */
export function spendByCategory(expenses: Expense[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const e of expenses) totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amount);
  const total = totalSpend(expenses);
  return [...totals.entries()]
    .map(([id, amount]) => ({ id, label: expenseCategoryLabel(id), amount, share: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Spend split across the two halves of the studio. Anything booked to "both" is left in its own
 * bucket rather than guessed at, so the figures stay honest: a gas bill is not half a cake.
 */
export function spendByLine(expenses: Expense[]): Record<Line, number> {
  const out: Record<Line, number> = { cakes: 0, ruffles: 0, both: 0 };
  for (const e of expenses) out[expenseCategory(e.categoryId)?.line ?? "both"] += e.amount;
  return out;
}

export interface Profit {
  received: number;
  spent: number;
  profit: number;
  /** Profit as a share of what came in, 0–1. null when nothing came in, where a margin means nothing. */
  margin: number | null;
}

/** What came in, what went out and what is left, over one period. */
export function profitIn(orders: Order[], expenses: Expense[], range: Range): Profit {
  const received = orders
    .flatMap((o) => o.payments)
    .filter((p) => inRange(dayKey(new Date(p.at)), range))
    .reduce((sum, p) => sum + p.amount, 0);
  const spent = totalSpend(expensesIn(expenses, range));
  return { received, spent, profit: received - spent, margin: received > 0 ? (received - spent) / received : null };
}

/** What one order actually cost to make, from the direct costs booked against it. */
export const costOfOrder = (expenses: Expense[], orderId: string) => totalSpend(expenses.filter((e) => e.orderId === orderId));

/** Only the categories still switched on, for the add form. */
export const activeCategories = () => EXPENSE_CATEGORIES;

/** Validation shared by the add form and the store, so both reject the same things. */
export function validateExpense(input: { amount: number; categoryId: string; on: string }): string | null {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return "Enter an amount above zero.";
  if (input.amount > 1_000_000) return "That's more than GH₵ 1,000,000. Check the amount.";
  if (!expenseCategory(input.categoryId)) return "Choose what it was for.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.on)) return "Choose the day the money went out.";
  return null;
}
