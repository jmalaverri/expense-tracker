'use client';

import Link from 'next/link';
import { Expense } from '@/types/expense';
import { formatCurrency } from '@/lib/utils';
import CategoryBadge from './CategoryBadge';
import { ArrowRight } from 'lucide-react';

interface Props {
  expenses: Expense[];
}

export default function RecentExpenses({ expenses }: Props) {
  const recent = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Recent Expenses</h2>
          <p className="text-sm text-gray-400 mt-0.5">Latest transactions</p>
        </div>
        <Link
          href="/expenses"
          className="flex items-center gap-1 text-sm text-violet-600 font-medium hover:text-violet-800 transition-colors"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <p>No expenses yet.</p>
          <Link href="/expenses/new" className="mt-2 inline-block text-violet-600 font-medium hover:underline">
            Add your first expense
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center w-11 h-11 bg-gray-100 rounded-xl flex-shrink-0">
                <span className="text-xs text-gray-500 font-medium leading-none">
                  {new Date(expense.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <span className="text-base font-bold text-gray-800 leading-tight">
                  {new Date(expense.date + 'T00:00:00').getDate()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{expense.description}</p>
                <CategoryBadge category={expense.category} size="sm" />
              </div>
              <p className="font-bold text-gray-900 flex-shrink-0">{formatCurrency(expense.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
