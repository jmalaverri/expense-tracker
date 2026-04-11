import { Expense, ExpenseFilters, SpendingSummary, Category, CATEGORIES } from '@/types/expense';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getMonthRange(monthsAgo = 0): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() - monthsAgo;
  const from = new Date(year, month, 1).toISOString().split('T')[0];
  const to = new Date(year, month + 1, 0).toISOString().split('T')[0];
  return { from, to };
}

export function filterExpenses(expenses: Expense[], filters: ExpenseFilters): Expense[] {
  let result = [...expenses];

  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }

  if (filters.category !== 'All') {
    result = result.filter((e) => e.category === filters.category);
  }

  if (filters.dateFrom) {
    result = result.filter((e) => e.date >= filters.dateFrom);
  }

  if (filters.dateTo) {
    result = result.filter((e) => e.date <= filters.dateTo);
  }

  result.sort((a, b) => {
    switch (filters.sortBy) {
      case 'date-desc':
        return b.date.localeCompare(a.date);
      case 'date-asc':
        return a.date.localeCompare(b.date);
      case 'amount-desc':
        return b.amount - a.amount;
      case 'amount-asc':
        return a.amount - b.amount;
      default:
        return b.date.localeCompare(a.date);
    }
  });

  return result;
}

export function computeSummary(expenses: Expense[]): SpendingSummary {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split('T')[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    .toISOString()
    .split('T')[0];

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const thisMonthExpenses = expenses.filter(
    (e) => e.date >= thisMonthStart && e.date <= thisMonthEnd
  );
  const thisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const lastMonthExpenses = expenses.filter(
    (e) => e.date >= lastMonthStart && e.date <= lastMonthEnd
  );
  const lastMonth = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    return acc;
  }, {} as Record<Category, number>);

  const topCategory = (Object.entries(byCategory) as [Category, number][])
    .sort((a, b) => b[1] - a[1])
    .find(([, v]) => v > 0)?.[0] ?? null;

  // avg per day based on days in current month so far
  const daysIntoMonth = now.getDate();
  const avgPerDay = daysIntoMonth > 0 ? thisMonth / daysIntoMonth : 0;

  return {
    total,
    thisMonth,
    lastMonth,
    byCategory,
    topCategory,
    avgPerDay,
    count: expenses.length,
  };
}

export function getMonthlyTrend(
  expenses: Expense[],
  months = 6
): { month: string; amount: number }[] {
  const now = new Date();
  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const year = now.getFullYear();
    const month = now.getMonth() - i;
    const from = new Date(year, month, 1).toISOString().split('T')[0];
    const to = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const monthExpenses = expenses.filter((e) => e.date >= from && e.date <= to);
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const label = new Date(year, month, 1).toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });

    result.push({ month: label, amount: total });
  }

  return result;
}

export function exportToCSV(expenses: Expense[]): void {
  const headers = ['Date', 'Description', 'Category', 'Amount'];
  const rows = expenses.map((e) => [
    e.date,
    `"${e.description.replace(/"/g, '""')}"`,
    e.category,
    e.amount.toFixed(2),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `expenses-${getTodayString()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
