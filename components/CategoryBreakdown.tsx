'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { SpendingSummary, CATEGORY_COLORS, Category, CATEGORY_ICONS } from '@/types/expense';
import { formatCurrency } from '@/lib/utils';

interface Props {
  summary: SpendingSummary;
}

interface TooltipProps { active?: boolean; payload?: { value: number; name: string; payload: { fill: string; percent: string } }[]; }
const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-4 py-3">
        <p className="text-sm font-semibold text-gray-700">{payload[0].name}</p>
        <p className="text-lg font-bold" style={{ color: payload[0].payload.fill }}>
          {formatCurrency(payload[0].value)}
        </p>
        <p className="text-xs text-gray-400">{payload[0].payload.percent}% of total</p>
      </div>
    );
  }
  return null;
};

export default function CategoryBreakdown({ summary }: Props) {
  const total = Object.values(summary.byCategory).reduce((s, v) => s + v, 0);

  const data = (Object.entries(summary.byCategory) as [Category, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => ({
      name: cat,
      value: amount,
      fill: CATEGORY_COLORS[cat],
      percent: total > 0 ? ((amount / total) * 100).toFixed(1) : '0',
    }));

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">By Category</h2>
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          No data yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">By Category</h2>
        <p className="text-sm text-gray-400 mt-0.5">Spending breakdown</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-full sm:w-48 h-48 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 w-full space-y-2.5">
          {data.map(({ name, value, fill, percent }) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-base flex-shrink-0">
                {CATEGORY_ICONS[name as Category]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{name}</span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(value)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${percent}%`, backgroundColor: fill }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-400 w-10 text-right flex-shrink-0">
                {percent}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
