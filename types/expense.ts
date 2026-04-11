export type Category =
  | 'Food'
  | 'Transportation'
  | 'Entertainment'
  | 'Shopping'
  | 'Bills'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#f97316',
  Transportation: '#3b82f6',
  Entertainment: '#a855f7',
  Shopping: '#ec4899',
  Bills: '#ef4444',
  Other: '#6b7280',
};

export const CATEGORY_BG: Record<Category, string> = {
  Food: 'bg-orange-100 text-orange-700 border-orange-200',
  Transportation: 'bg-blue-100 text-blue-700 border-blue-200',
  Entertainment: 'bg-purple-100 text-purple-700 border-purple-200',
  Shopping: 'bg-pink-100 text-pink-700 border-pink-200',
  Bills: 'bg-red-100 text-red-700 border-red-200',
  Other: 'bg-gray-100 text-gray-700 border-gray-200',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  Food: '🍔',
  Transportation: '🚗',
  Entertainment: '🎬',
  Shopping: '🛍️',
  Bills: '💡',
  Other: '📦',
};

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string; // ISO datetime
}

export interface ExpenseFormData {
  amount: string;
  category: Category;
  description: string;
  date: string;
}

export interface ExpenseFilters {
  search: string;
  category: Category | 'All';
  dateFrom: string;
  dateTo: string;
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
}

export interface SpendingSummary {
  total: number;
  thisMonth: number;
  lastMonth: number;
  byCategory: Record<Category, number>;
  topCategory: Category | null;
  avgPerDay: number;
  count: number;
}
