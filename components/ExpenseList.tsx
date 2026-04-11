'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Expense, ExpenseFilters, CATEGORIES } from '@/types/expense';
import { filterExpenses, formatCurrency, formatDate } from '@/lib/utils';
import CategoryBadge from './CategoryBadge';
import DeleteModal from './DeleteModal';
import {
  Search,
  Filter,
  Pencil,
  Trash2,
  ChevronDown,
  X,
  Download,
  Receipt,
} from 'lucide-react';
import { exportToCSV } from '@/lib/utils';

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

const DEFAULT_FILTERS: ExpenseFilters = {
  search: '',
  category: 'All',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date-desc',
};

export default function ExpenseList({ expenses, onDelete }: Props) {
  const [filters, setFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = filterExpenses(expenses, filters);
  const hasActiveFilters =
    filters.search ||
    filters.category !== 'All' ||
    filters.dateFrom ||
    filters.dateTo;

  function updateFilter<K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function handleDelete() {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses…"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-0 transition-colors"
            />
            {filters.search && (
              <button
                onClick={() => updateFilter('search', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-violet-300 bg-violet-50 text-violet-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-violet-500" />
            )}
          </button>
          <button
            onClick={() => exportToCSV(filtered)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            title="Export to CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-gray-100">
            {/* Category */}
            <div className="relative">
              <label className="block text-xs text-gray-500 mb-1 font-medium">Category</label>
              <div className="relative">
                <select
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value as ExpenseFilters['category'])}
                  className="w-full pl-3 pr-8 py-2 rounded-lg border border-gray-200 text-sm appearance-none focus:outline-none focus:border-violet-400 bg-white"
                >
                  <option value="All">All</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Date from */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-violet-400"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-violet-400"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Sort by</label>
              <div className="relative">
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value as ExpenseFilters['sortBy'])}
                  className="w-full pl-3 pr-8 py-2 rounded-lg border border-gray-200 text-sm appearance-none focus:outline-none focus:border-violet-400 bg-white"
                >
                  <option value="date-desc">Newest first</option>
                  <option value="date-asc">Oldest first</option>
                  <option value="amount-desc">Highest amount</option>
                  <option value="amount-asc">Lowest amount</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="col-span-2 sm:col-span-4 text-sm text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1.5 justify-center py-1"
              >
                <X className="w-3.5 h-3.5" /> Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{filtered.length}</span>{' '}
          {filtered.length === 1 ? 'expense' : 'expenses'}
          {hasActiveFilters && (
            <span className="text-gray-400"> (filtered from {expenses.length})</span>
          )}
        </p>
        <p className="text-sm font-semibold text-gray-800">
          Total:{' '}
          <span className="text-violet-600">
            {formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}
          </span>
        </p>
      </div>

      {/* Expense items */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No expenses found</h3>
          <p className="text-sm text-gray-400">
            {hasActiveFilters
              ? 'Try adjusting your filters'
              : 'Add your first expense to get started'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-violet-600 font-medium hover:underline"
            >
              Clear filters
            </button>
          ) : (
            <Link
              href="/expenses/new"
              className="mt-4 inline-block text-sm text-violet-600 font-medium hover:underline"
            >
              Add expense
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((expense) => (
            <div
              key={expense.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow group"
            >
              {/* Date column */}
              <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 bg-gray-50 rounded-xl flex-shrink-0 border border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase leading-none">
                  {new Date(expense.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <span className="text-xl font-bold text-gray-800 leading-tight">
                  {new Date(expense.date + 'T00:00:00').getDate()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 truncate">{expense.description}</p>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <CategoryBadge category={expense.category} size="sm" />
                  <span className="text-xs text-gray-400 sm:hidden">{formatDate(expense.date)}</span>
                </div>
              </div>

              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/expenses/${expense.id}/edit`}
                  className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setDeleteTarget(expense)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteModal
        expense={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
