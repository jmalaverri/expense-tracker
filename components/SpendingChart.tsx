'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getMonthlyTrend, formatCurrency } from '@/lib/utils';
import { Expense } from '@/types/expense';

interface Props {
  expenses: Expense[];
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

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

export default function SpendingChart({ expenses }: Props) {
  const data = getMonthlyTrend(expenses, 6);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Monthly Spending</h2>
          <p className="text-sm text-gray-400 mt-0.5">Last 6 months overview</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="30%">
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
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f3ff' }} />
          <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
            {data.map((_entry, index) => (
              <Cell
                key={index}
                fill={index === data.length - 1 ? 'url(#violetGradient)' : '#e0e7ff'}
              />
            ))}
          </Bar>
          <defs>
            <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
