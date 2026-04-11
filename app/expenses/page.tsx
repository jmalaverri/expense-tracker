'use client';

import { useExpenses } from '@/hooks/useExpenses';
import ExpenseList from '@/components/ExpenseList';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default function ExpensesPage() {
  const { expenses, isLoaded, remove } = useExpenses();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Expenses</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage and review your spending
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

      <ExpenseList expenses={expenses} onDelete={remove} />
    </div>
  );
}
