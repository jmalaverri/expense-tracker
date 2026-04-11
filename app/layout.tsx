import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SpendWise — Expense Tracker',
  description: 'Track your personal expenses with ease',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 antialiased`}>
        <Navbar />
        {/* Desktop: offset for sidebar; Mobile: offset for top header + bottom nav */}
        <main className="lg:ml-64 min-h-screen pt-14 pb-24 lg:pt-0 lg:pb-0">
          <div className="max-w-5xl mx-auto p-4 lg:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
