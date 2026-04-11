'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import { useExpenses } from '@/hooks/useExpenses';
import { computeSummary, getMonthlyTrend, formatCurrency } from '@/lib/utils';
import {
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  Category,
} from '@/types/expense';
import { exportToCSV } from '@/lib/utils';
import { Download, TrendingUp } from 'lucide-react';

interface TooltipProps { active?: boolean; payload?: { value: number; name: string; payload: { fill: string } }[]; label?: string; }
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-4 py-3">
        <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
        <p className="text-lg font-bold text-violet-600">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { expenses, isLoaded } = useExpenses();
  const summary = useMemo(() => computeSummary(expenses), [expenses]);
  const trend = useMemo(() => getMonthlyTrend(expenses, 6), [expenses]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  const categoryData = (CATEGORIES as Category[])
    .map((cat) => ({
      name: cat,
      amount: summary.byCategory[cat] ?? 0,
      icon: CATEGORY_ICONS[cat],
      color: CATEGORY_COLORS[cat],
    }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = Object.values(summary.byCategory).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">Insights into your spending patterns</p>
        </div>
        <button
          onClick={() => exportToCSV(expenses)}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">No data yet</p>
          <p className="text-sm text-gray-400 mt-1">Add expenses to see analytics</p>
        </div>
      ) : (
        <>
          {/* Monthly trend line chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900">Spending Trend</h2>
              <p className="text-sm text-gray-400">Monthly totals over the last 6 months</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(v) =>
                    `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  dot={{ fill: '#7c3aed', r: 5, strokeWidth: 0 }}
                  activeDot={{ r: 7, fill: '#7c3aed' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Category bar chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900">Spending by Category</h2>
              <p className="text-sm text-gray-400">Total across all time</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(v) =>
                    `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
                  }
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f3ff' }} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category details table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900">Category Details</h2>
              <p className="text-sm text-gray-400">Breakdown with percentages</p>
            </div>
            <div className="space-y-3">
              {categoryData.map(({ name, amount, icon, color }) => {
                const pct = total > 0 ? (amount / total) * 100 : 0;
                const count = expenses.filter((e) => e.category === name).length;
                return (
                  <div key={name} className="flex items-center gap-4">
                    <span className="text-xl w-8 text-center">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <div>
                          <span className="font-semibold text-gray-800 text-sm">{name}</span>
                          <span className="text-xs text-gray-400 ml-2">
                            {count} {count === 1 ? 'expense' : 'expenses'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-900 text-sm">{formatCurrency(amount)}</span>
                          <span className="text-xs text-gray-400 ml-2">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Expenses', value: summary.count.toString() },
              {
                label: 'Largest Expense',
                value: formatCurrency(
                  expenses.length > 0 ? Math.max(...expenses.map((e) => e.amount)) : 0
                ),
              },
              {
                label: 'Smallest Expense',
                value: formatCurrency(
                  expenses.length > 0 ? Math.min(...expenses.map((e) => e.amount)) : 0
                ),
              },
              {
                label: 'Average Expense',
                value: formatCurrency(
                  expenses.length > 0
                    ? expenses.reduce((s, e) => s + e.amount, 0) / expenses.length
                    : 0
                ),
              },
              {
                label: 'Top Category',
                value: summary.topCategory
                  ? `${CATEGORY_ICONS[summary.topCategory]} ${summary.topCategory}`
                  : 'N/A',
              },
              {
                label: 'Daily Average',
                value: formatCurrency(summary.avgPerDay),
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
              >
                <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                <p className="text-lg font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
