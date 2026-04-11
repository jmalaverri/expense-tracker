'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, List, PlusCircle, TrendingUp } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/expenses', label: 'Expenses', icon: List },
  { href: '/expenses/new', label: 'Add Expense', icon: PlusCircle },
  { href: '/analytics', label: 'Analytics', icon: TrendingUp },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-gray-100 shadow-sm fixed left-0 top-0 z-10">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-base">$</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">SpendWise</h1>
              <p className="text-xs text-gray-400">Expense Tracker</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-violet-50 text-violet-700 shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${active ? 'text-violet-600' : 'text-gray-400'}`}
                />
                {label}
                {href === '/expenses/new' && (
                  <span className="ml-auto bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full">
                    New
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">Data saved locally</p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 shadow-lg">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  active ? 'text-violet-600' : 'text-gray-400'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-violet-600' : ''}`} />
                <span className="text-xs font-medium">{label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile top header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">$</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">SpendWise</h1>
        </div>
      </header>
    </>
  );
}
