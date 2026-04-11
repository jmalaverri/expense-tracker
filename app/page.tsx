'use client';

import { useMemo } from 'react';
import { useExpenses } from '@/hooks/useExpenses';
import { computeSummary } from '@/lib/utils';
import SummaryCards from '@/components/SummaryCards';
import SpendingChart from '@/components/SpendingChart';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import RecentExpenses from '@/components/RecentExpenses';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  const { expenses, isLoaded } = useExpenses();
  const summary = useMemo(() => computeSummary(expenses), [expenses]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading your expenses…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <Link
          href="/expenses/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-violet-700 hover:to-indigo-700 transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Add Expense</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Summary cards */}
      <SummaryCards summary={summary} />

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SpendingChart expenses={expenses} />
        </div>
        <div>
          <CategoryBreakdown summary={summary} />
        </div>
      </div>

      {/* Recent expenses */}
      <RecentExpenses expenses={expenses} />
    </div>
  );
}
