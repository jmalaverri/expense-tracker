'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Expense, ExpenseFormData, CATEGORIES, Category } from '@/types/expense';
import { getTodayString } from '@/lib/utils';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  onSubmit: (data: Omit<Expense, 'id' | 'createdAt'>) => void;
  initialData?: Expense;
  mode?: 'add' | 'edit';
}

const CATEGORY_ICONS: Record<Category, string> = {
  Food: '🍔',
  Transportation: '🚗',
  Entertainment: '🎬',
  Shopping: '🛍️',
  Bills: '💡',
  Other: '📦',
};

export default function ExpenseForm({ onSubmit, initialData, mode = 'add' }: Props) {
  const router = useRouter();

  const [form, setForm] = useState<ExpenseFormData>({
    amount: initialData ? initialData.amount.toString() : '',
    category: initialData?.category ?? 'Food',
    description: initialData?.description ?? '',
    date: initialData?.date ?? getTodayString(),
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errs: Partial<Record<keyof ExpenseFormData, string>> = {};

    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      errs.amount = 'Please enter a valid amount greater than 0';
    } else if (amount > 1_000_000) {
      errs.amount = 'Amount cannot exceed $1,000,000';
    }

    if (!form.description.trim()) {
      errs.description = 'Description is required';
    } else if (form.description.trim().length < 2) {
      errs.description = 'Description must be at least 2 characters';
    } else if (form.description.trim().length > 100) {
      errs.description = 'Description cannot exceed 100 characters';
    }

    if (!form.date) {
      errs.date = 'Please select a date';
    } else if (form.date > getTodayString()) {
      errs.date = 'Date cannot be in the future';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 300));

    onSubmit({
      amount: parseFloat(parseFloat(form.amount).toFixed(2)),
      category: form.category,
      description: form.description.trim(),
      date: form.date,
    });

    if (mode === 'add') {
      setSuccess(true);
      setForm({
        amount: '',
        category: 'Food',
        description: '',
        date: getTodayString(),
      });
      setErrors({});
      setTimeout(() => {
        setSuccess(false);
        setSubmitting(false);
      }, 2000);
    } else {
      setSubmitting(false);
      router.push('/expenses');
    }
  }

  function handleChange(field: keyof ExpenseFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 animate-pulse-once">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <span className="font-medium">Expense added successfully!</span>
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Amount <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-lg">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1000000"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            className={`w-full pl-9 pr-4 py-3.5 text-lg font-semibold rounded-xl border-2 transition-colors bg-white focus:outline-none focus:ring-0 ${
              errors.amount
                ? 'border-red-300 focus:border-red-400 bg-red-50'
                : 'border-gray-200 focus:border-violet-400'
            }`}
          />
        </div>
        {errors.amount && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" /> {errors.amount}
          </p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Category <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleChange('category', cat)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
                form.category === cat
                  ? 'border-violet-400 bg-violet-50 text-violet-700 shadow-sm scale-[1.02]'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
              <span className="text-xs">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="What did you spend on?"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          maxLength={100}
          className={`w-full px-4 py-3 rounded-xl border-2 transition-colors bg-white focus:outline-none focus:ring-0 ${
            errors.description
              ? 'border-red-300 focus:border-red-400 bg-red-50'
              : 'border-gray-200 focus:border-violet-400'
          }`}
        />
        <div className="flex justify-between mt-1.5">
          {errors.description ? (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" /> {errors.description}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400 ml-auto">{form.description.length}/100</span>
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={form.date}
          max={getTodayString()}
          onChange={(e) => handleChange('date', e.target.value)}
          className={`w-full px-4 py-3 rounded-xl border-2 transition-colors bg-white focus:outline-none focus:ring-0 ${
            errors.date
              ? 'border-red-300 focus:border-red-400 bg-red-50'
              : 'border-gray-200 focus:border-violet-400'
          }`}
        />
        {errors.date && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" /> {errors.date}
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        {mode === 'edit' && (
          <button
            type="button"
            onClick={() => router.push('/expenses')}
            className="flex-1 py-3.5 px-6 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-lg hover:from-violet-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting
            ? mode === 'add'
              ? 'Adding…'
              : 'Saving…'
            : mode === 'add'
            ? 'Add Expense'
            : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
