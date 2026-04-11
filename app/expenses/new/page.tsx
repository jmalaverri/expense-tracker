'use client';

import { useExpenses } from '@/hooks/useExpenses';
import ExpenseForm from '@/components/ExpenseForm';
import { Expense } from '@/types/expense';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default function NewExpensePage() {
  const { add } = useExpenses();

  function handleSubmit(data: Omit<Expense, 'id' | 'createdAt'>) {
    add(data);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/expenses"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Expense</h1>
          <p className="text-gray-500 text-sm mt-0.5">Record a new transaction</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <ExpenseForm onSubmit={handleSubmit} mode="add" />
      </div>

      <div className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-xl p-4">
        <Lightbulb className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-violet-700">
          <strong>Tip:</strong> After adding an expense, the form resets automatically so you can quickly add multiple expenses in a row.
        </p>
      </div>
    </div>
  );
}
