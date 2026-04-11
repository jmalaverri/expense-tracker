'use client';

import { SpendingSummary } from '@/types/expense';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, Calendar, Target } from 'lucide-react';

interface Props {
  summary: SpendingSummary;
}

export default function SummaryCards({ summary }: Props) {
  const monthChange =
    summary.lastMonth > 0
      ? ((summary.thisMonth - summary.lastMonth) / summary.lastMonth) * 100
      : 0;

  const cards = [
    {
      title: 'Total Spent',
      value: formatCurrency(summary.total),
      subtitle: `${summary.count} total expenses`,
      icon: Wallet,
      gradient: 'from-violet-500 to-indigo-600',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
    },
    {
      title: 'This Month',
      value: formatCurrency(summary.thisMonth),
      subtitle:
        summary.lastMonth > 0
          ? `${Math.abs(monthChange).toFixed(0)}% ${monthChange >= 0 ? 'more' : 'less'} than last month`
          : 'No data for last month',
      icon: monthChange >= 0 ? TrendingUp : TrendingDown,
      gradient: monthChange > 10 ? 'from-rose-500 to-pink-600' : 'from-emerald-500 to-teal-600',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
      badge:
        summary.lastMonth > 0
          ? {
              text: `${monthChange >= 0 ? '+' : ''}${monthChange.toFixed(1)}%`,
              bg: monthChange >= 0 ? 'bg-white/20' : 'bg-white/20',
            }
          : null,
    },
    {
      title: 'Last Month',
      value: formatCurrency(summary.lastMonth),
      subtitle: 'Previous month total',
      icon: Calendar,
      gradient: 'from-blue-500 to-cyan-600',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
    },
    {
      title: 'Daily Average',
      value: formatCurrency(summary.avgPerDay),
      subtitle: 'Per day this month',
      icon: Target,
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-white/20',
      textColor: 'text-white',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(({ title, value, subtitle, icon: Icon, gradient, iconBg, textColor, badge }) => (
        <div
          key={title}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 shadow-lg`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-2.5 rounded-xl ${iconBg}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            {badge && (
              <span className={`text-xs font-semibold text-white ${badge.bg} px-2.5 py-1 rounded-full`}>
                {badge.text}
              </span>
            )}
          </div>
          <p className="text-white/70 text-sm font-medium mb-1">{title}</p>
          <p className={`text-2xl font-bold ${textColor} mb-1`}>{value}</p>
          <p className="text-white/60 text-xs truncate">{subtitle}</p>

          {/* Decorative circle */}
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -right-2 w-16 h-16 rounded-full bg-white/5" />
        </div>
      ))}
    </div>
  );
}
