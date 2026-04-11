'use client';

import { Expense } from '@/types/expense';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  expense: Expense | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteModal({ expense, onConfirm, onCancel }: Props) {
  if (!expense) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Delete Expense</h2>
        <p className="text-gray-500 text-sm text-center mb-5">
          Are you sure you want to delete this expense? This action cannot be undone.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="font-semibold text-gray-800 truncate">{expense.description}</p>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-gray-500">{formatDate(expense.date)}</span>
            <span className="font-bold text-gray-900">{formatCurrency(expense.amount)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors shadow-md"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
