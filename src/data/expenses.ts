import type { ExpenseCategory } from "./types";

/**
 * The starting set of things the studio spends money on, drawn from how Hillary actually works:
 * a kitchen and a workroom buying different materials, both of them packing and delivering, and
 * the bills that arrive whether or not anyone orders.
 *
 * She is not expected to use all of them. Every one can be switched off in Expenses, which takes
 * it out of the add form and the charts without touching what she has already recorded.
 */
const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: "ingredients", label: "Ingredients", line: "cakes", kind: "direct" },
  { id: "materials", label: "Beads & materials", line: "ruffles", kind: "direct" },
  { id: "packaging", label: "Packaging", line: "both", kind: "direct" },
  { id: "transport", label: "Transport & delivery", line: "both", kind: "direct" },
  { id: "utilities", label: "Utilities & gas", line: "both", kind: "overhead" },
  { id: "rent", label: "Rent", line: "both", kind: "overhead" },
  { id: "equipment", label: "Equipment", line: "both", kind: "overhead" },
  { id: "marketing", label: "Marketing", line: "both", kind: "overhead" },
];

export const defaultExpenseCategories = (): ExpenseCategory[] => DEFAULT_CATEGORIES.map((c) => ({ ...c }));

/** Every category ever offered, switched-off ones included, so old expenses still name themselves. */
const ALL = new Map<string, ExpenseCategory>(DEFAULT_CATEGORIES.map((c) => [c.id, c]));

/** The categories the owner is using: what the add form and the charts show. */
export const EXPENSE_CATEGORIES: ExpenseCategory[] = defaultExpenseCategories();

export function applyExpenseCategories(categories: ExpenseCategory[]) {
  for (const c of categories) ALL.set(c.id, c);
  for (const c of DEFAULT_CATEGORIES) if (!ALL.has(c.id)) ALL.set(c.id, c);
  EXPENSE_CATEGORIES.length = 0;
  EXPENSE_CATEGORIES.push(...categories.filter((c) => c.active !== false));
}

export const expenseCategory = (id: string) => ALL.get(id);
export const expenseCategoryLabel = (id: string) => ALL.get(id)?.label ?? id;
