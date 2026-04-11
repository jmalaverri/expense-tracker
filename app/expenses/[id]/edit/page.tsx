'use client';

import { useParams } from 'next/navigation';
import { useExpenses } from '@/hooks/useExpenses';
import ExpenseForm from '@/components/ExpenseForm';
import { Expense } from '@/types/expense';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditExpensePage() {
  const { id } = useParams<{ id: string }>();
  const { expenses, update, isLoaded } = useExpenses();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  const expense = expenses.find((e) => e.id === id);

  if (!expense) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-xl font-bold text-gray-800 mb-2">Expense not found</p>
        <p className="text-gray-500 mb-6">This expense may have been deleted.</p>
        <Link
          href="/expenses"
          className="inline-flex items-center gap-2 px-5 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Expenses
        </Link>
      </div>
    );
  }

  function handleSubmit(data: Omit<Expense, 'id' | 'createdAt'>) {
    update({ ...data, id: expense!.id, createdAt: expense!.createdAt });
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Expense</h1>
          <p className="text-gray-500 text-sm mt-0.5">Update this transaction</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <ExpenseForm onSubmit={handleSubmit} initialData={expense} mode="edit" />
      </div>
    </div>
  );
}
