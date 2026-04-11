import { Expense } from '@/types/expense';

const STORAGE_KEY = 'expense-tracker-data';

export function loadExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultExpenses();
    return JSON.parse(raw) as Expense[];
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function addExpense(expense: Expense): Expense[] {
  const expenses = loadExpenses();
  const updated = [expense, ...expenses];
  saveExpenses(updated);
  return updated;
}

export function updateExpense(updated: Expense): Expense[] {
  const expenses = loadExpenses();
  const result = expenses.map((e) => (e.id === updated.id ? updated : e));
  saveExpenses(result);
  return result;
}

export function deleteExpense(id: string): Expense[] {
  const expenses = loadExpenses();
  const result = expenses.filter((e) => e.id !== id);
  saveExpenses(result);
  return result;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Seed with realistic sample data for demo purposes
function getDefaultExpenses(): Expense[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const makeDate = (y: number, m: number, d: number) =>
    new Date(y, m, d).toISOString().split('T')[0];

  const samples: Omit<Expense, 'id' | 'createdAt'>[] = [
    { amount: 45.5, category: 'Food', description: 'Weekly groceries', date: makeDate(year, month, 2) },
    { amount: 12.99, category: 'Entertainment', description: 'Netflix subscription', date: makeDate(year, month, 1) },
    { amount: 85.0, category: 'Bills', description: 'Electricity bill', date: makeDate(year, month, 3) },
    { amount: 32.0, category: 'Transportation', description: 'Gas station fill-up', date: makeDate(year, month, 4) },
    { amount: 67.49, category: 'Shopping', description: 'Clothing purchase', date: makeDate(year, month, 5) },
    { amount: 18.75, category: 'Food', description: 'Restaurant dinner', date: makeDate(year, month, 6) },
    { amount: 120.0, category: 'Bills', description: 'Internet bill', date: makeDate(year, month, 1) },
    { amount: 9.99, category: 'Entertainment', description: 'Spotify', date: makeDate(year, month, 1) },
    { amount: 55.0, category: 'Food', description: 'Groceries', date: makeDate(year, month, 9) },
    { amount: 25.0, category: 'Transportation', description: 'Uber rides', date: makeDate(year, month, 8) },
    { amount: 200.0, category: 'Shopping', description: 'Amazon order', date: makeDate(year, month, 7) },
    { amount: 14.5, category: 'Food', description: 'Lunch with colleagues', date: makeDate(year, month, 10) },
    { amount: 300.0, category: 'Bills', description: 'Rent portion', date: makeDate(year, month - 1, 1) },
    { amount: 22.0, category: 'Food', description: 'Takeout pizza', date: makeDate(year, month - 1, 15) },
    { amount: 40.0, category: 'Entertainment', description: 'Movie tickets', date: makeDate(year, month - 1, 20) },
    { amount: 75.0, category: 'Transportation', description: 'Monthly transit pass', date: makeDate(year, month - 1, 5) },
    { amount: 130.0, category: 'Shopping', description: 'Electronics accessories', date: makeDate(year, month - 1, 12) },
    { amount: 48.0, category: 'Food', description: 'Supermarket run', date: makeDate(year, month - 1, 18) },
  ];

  const expenses: Expense[] = samples.map((s) => ({
    ...s,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }));

  saveExpenses(expenses);
  return expenses;
}
