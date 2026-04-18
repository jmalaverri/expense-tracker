import { Expense } from '@/types/expense';

// ─── Templates ────────────────────────────────────────────────────────────────

export type TemplateId = 'tax-report' | 'monthly-summary' | 'category-analysis' | 'full-backup';

export interface ExportTemplate {
  id: TemplateId;
  name: string;
  tagline: string;
  description: string;
  format: 'csv' | 'json';
  emoji: string;
  accent: string;       // Tailwind text color
  bg: string;           // Tailwind bg+border
  filter: (expenses: Expense[]) => Expense[];
}

function currentYear() { return new Date().getFullYear(); }
function currentMonthPrefix() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

export const TEMPLATES: ExportTemplate[] = [
  {
    id: 'tax-report',
    name: 'Tax Report',
    tagline: `${currentYear()} Fiscal Year`,
    description: 'All expenses for the current tax year, sorted by date — ready to hand to your accountant.',
    format: 'csv',
    emoji: '🧾',
    accent: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    filter: (expenses) =>
      expenses
        .filter((e) => e.date.startsWith(String(currentYear())))
        .sort((a, b) => a.date.localeCompare(b.date)),
  },
  {
    id: 'monthly-summary',
    name: 'Monthly Summary',
    tagline: 'Current Month',
    description: 'This month\'s spending grouped by amount — great for a quick budget review.',
    format: 'csv',
    emoji: '📅',
    accent: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    filter: (expenses) =>
      expenses
        .filter((e) => e.date.startsWith(currentMonthPrefix()))
        .sort((a, b) => b.amount - a.amount),
  },
  {
    id: 'category-analysis',
    name: 'Category Analysis',
    tagline: 'Spending Breakdown',
    description: 'All expenses sorted by category then amount — ideal for trend and budget analysis.',
    format: 'csv',
    emoji: '🏷️',
    accent: 'text-violet-700',
    bg: 'bg-violet-50 border-violet-200',
    filter: (expenses) =>
      [...expenses].sort((a, b) =>
        a.category !== b.category
          ? a.category.localeCompare(b.category)
          : b.amount - a.amount
      ),
  },
  {
    id: 'full-backup',
    name: 'Full Backup',
    tagline: 'Complete Archive',
    description: 'Every record in structured JSON with metadata — for safe keeping or migration.',
    format: 'json',
    emoji: '💾',
    accent: 'text-orange-700',
    bg: 'bg-orange-50 border-orange-200',
    filter: (expenses) => [...expenses].sort((a, b) => b.date.localeCompare(a.date)),
  },
];

// ─── Destinations ─────────────────────────────────────────────────────────────

export type DestinationId =
  | 'download'
  | 'email'
  | 'google-sheets'
  | 'dropbox'
  | 'onedrive'
  | 'share-link';

export interface Destination {
  id: DestinationId;
  name: string;
  description: string;
  needsAuth: boolean;
}

export const DESTINATIONS: Destination[] = [
  { id: 'download',      name: 'Download',       description: 'Save file to your device',       needsAuth: false },
  { id: 'email',         name: 'Email',           description: 'Send to an inbox',               needsAuth: false },
  { id: 'share-link',    name: 'Share Link',      description: 'Shareable URL + copy to clipboard', needsAuth: false },
  { id: 'google-sheets', name: 'Google Sheets',   description: 'Open in a new spreadsheet',     needsAuth: true  },
  { id: 'dropbox',       name: 'Dropbox',         description: 'Save to your cloud storage',    needsAuth: true  },
  { id: 'onedrive',      name: 'OneDrive',        description: 'Save to Microsoft cloud',       needsAuth: true  },
];

// ─── Connections ──────────────────────────────────────────────────────────────

const CONNECTIONS_KEY = 'expense-tracker-cloud-connections';

export interface ServiceConnection {
  connected: boolean;
  accountEmail?: string;
  lastSync?: string; // ISO string
}

type ConnectionMap = Record<DestinationId, ServiceConnection>;

const DEFAULT_CONNECTIONS: ConnectionMap = {
  download:       { connected: true },
  email:          { connected: true },
  'share-link':   { connected: true },
  'google-sheets':{ connected: false },
  dropbox:        { connected: false },
  onedrive:       { connected: false },
};

export function loadConnections(): ConnectionMap {
  if (typeof window === 'undefined') return DEFAULT_CONNECTIONS;
  try {
    const stored = JSON.parse(localStorage.getItem(CONNECTIONS_KEY) || '{}');
    return { ...DEFAULT_CONNECTIONS, ...stored };
  } catch { return DEFAULT_CONNECTIONS; }
}

export function saveConnections(map: ConnectionMap): void {
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(map));
}

// ─── Export History ───────────────────────────────────────────────────────────

const HISTORY_KEY = 'expense-tracker-export-history';

export interface HistoryEntry {
  id: string;
  timestamp: string;      // ISO
  templateId: TemplateId;
  templateName: string;
  templateEmoji: string;
  destination: DestinationId;
  destinationName: string;
  recordCount: number;
  totalAmount: number;
  format: 'csv' | 'json';
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

export function addHistoryEntry(entry: Omit<HistoryEntry, 'id'>): HistoryEntry[] {
  const history = loadHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  const updated = [newEntry, ...history].slice(0, 30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

const SCHEDULE_KEY = 'expense-tracker-export-schedule';

export interface ExportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek: number;   // 0-6, for weekly
  dayOfMonth: number;  // 1-28, for monthly
  hour: number;        // 0-23
  templateId: TemplateId;
  destinationId: DestinationId;
  email: string;
}

const DEFAULT_SCHEDULE: ExportSchedule = {
  enabled: false,
  frequency: 'monthly',
  dayOfWeek: 1,
  dayOfMonth: 1,
  hour: 9,
  templateId: 'monthly-summary',
  destinationId: 'email',
  email: '',
};

export function loadSchedule(): ExportSchedule {
  if (typeof window === 'undefined') return DEFAULT_SCHEDULE;
  try {
    return { ...DEFAULT_SCHEDULE, ...JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}') };
  } catch { return DEFAULT_SCHEDULE; }
}

export function saveSchedule(schedule: ExportSchedule): void {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
}

export function computeNextRun(s: ExportSchedule): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(s.hour, 0, 0, 0);

  if (s.frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (s.frequency === 'weekly') {
    const delta = (s.dayOfWeek - now.getDay() + 7) % 7 || (next <= now ? 7 : 0);
    next.setDate(next.getDate() + delta);
  } else {
    next.setDate(s.dayOfMonth);
    if (next <= now) { next.setMonth(next.getMonth() + 1); next.setDate(s.dayOfMonth); }
  }

  const fmt = next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const h = s.hour;
  const time = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
  return `${fmt} at ${time}`;
}

// ─── Build helpers ────────────────────────────────────────────────────────────

function escapeCSV(v: string): string {
  return v.includes(',') || v.includes('"') || v.includes('\n')
    ? `"${v.replace(/"/g, '""')}"`
    : v;
}

export function buildCSV(expenses: Expense[]): string {
  const headers = ['Date', 'Category', 'Amount', 'Description'];
  const rows = expenses.map((e) => [
    e.date, e.category, e.amount.toFixed(2), escapeCSV(e.description),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function buildJSON(expenses: Expense[], templateName: string): string {
  return JSON.stringify({
    template: templateName,
    exported: new Date().toISOString(),
    count: expenses.length,
    total: parseFloat(expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)),
    expenses: expenses.map((e) => ({
      date: e.date, category: e.category, amount: e.amount, description: e.description,
    })),
  }, null, 2);
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function generateSharePayload(expenses: Expense[], templateName: string): string {
  // Encode as a data URI — a real, openable URL
  const json = buildJSON(expenses, templateName);
  return 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
}

export function generateShareToken(expenses: Expense[]): string {
  // Short hash for display (last 8 chars of btoa)
  const raw = expenses.map((e) => e.id).join('');
  return btoa(raw).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
}
