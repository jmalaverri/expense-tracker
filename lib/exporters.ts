import { Expense, Category } from '@/types/expense';

export type ExportFormat = 'csv' | 'json' | 'pdf';

// ─── Filtering ────────────────────────────────────────────────────────────────

export function filterForExport(
  expenses: Expense[],
  dateFrom: string,
  dateTo: string,
  categories: Category[]
): Expense[] {
  return expenses
    .filter((e) => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      if (categories.length > 0 && !categories.includes(e.category)) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCSV(expenses: Expense[]): string {
  const headers = ['Date', 'Category', 'Amount', 'Description'];
  const rows = expenses.map((e) => [
    e.date,
    e.category,
    e.amount.toFixed(2),
    escapeCSVField(e.description),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

export function buildJSON(expenses: Expense[]): string {
  const exported = new Date().toISOString();
  const data = {
    exported,
    count: expenses.length,
    total: parseFloat(expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)),
    expenses: expenses.map((e) => ({
      date: e.date,
      category: e.category,
      amount: e.amount,
      description: e.description,
    })),
  };
  return JSON.stringify(data, null, 2);
}

// ─── PDF (print-to-PDF via browser) ──────────────────────────────────────────

export function buildPDFHtml(expenses: Expense[], title: string): string {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const generatedOn = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Group totals by category for a summary sidebar
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }
  const categorySummaryRows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([cat, amt]) =>
        `<tr><td>${cat}</td><td style="text-align:right">$${amt.toFixed(2)}</td></tr>`
    )
    .join('');

  const expenseRows = expenses
    .map(
      (e) => `
      <tr>
        <td>${e.date}</td>
        <td><span class="badge badge-${e.category.toLowerCase()}">${e.category}</span></td>
        <td style="text-align:right; font-weight:600">$${e.amount.toFixed(2)}</td>
        <td>${e.description}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Arial, sans-serif; font-size: 12px; color: #111827; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .header h1 { font-size: 22px; font-weight: 700; color: #111827; }
    .header .meta { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .header .total-box { text-align: right; }
    .header .total-box .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
    .header .total-box .amount { font-size: 24px; font-weight: 800; color: #7c3aed; }
    .summary { display: flex; gap: 8px; margin-bottom: 24px; }
    .summary table { flex: 0 0 220px; border-collapse: collapse; background: #f9fafb; border-radius: 8px; overflow: hidden; }
    .summary table th { background: #f3f4f6; padding: 7px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; }
    .summary table td { padding: 6px 12px; border-top: 1px solid #e5e7eb; }
    .main-table { width: 100%; border-collapse: collapse; }
    .main-table thead th { background: #7c3aed; color: white; padding: 9px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; }
    .main-table thead th:nth-child(3) { text-align: right; }
    .main-table tbody td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    .main-table tbody tr:nth-child(even) td { background: #fafafa; }
    .main-table tfoot td { padding: 10px 12px; border-top: 2px solid #e5e7eb; font-weight: 700; font-size: 13px; }
    .main-table tfoot td:nth-child(2) { text-align: right; color: #7c3aed; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
    .badge-food { background: #ffedd5; color: #c2410c; }
    .badge-transportation { background: #dbeafe; color: #1d4ed8; }
    .badge-entertainment { background: #f3e8ff; color: #7e22ce; }
    .badge-shopping { background: #fce7f3; color: #be185d; }
    .badge-bills { background: #fee2e2; color: #b91c1c; }
    .badge-other { background: #f3f4f6; color: #374151; }
    .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 20px; } @page { margin: 1cm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${title}</h1>
      <div class="meta">Generated on ${generatedOn} &bull; ${expenses.length} record${expenses.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="total-box">
      <div class="label">Total Spend</div>
      <div class="amount">$${total.toFixed(2)}</div>
    </div>
  </div>

  <div class="summary">
    <table>
      <thead><tr><th colspan="2">By Category</th></tr></thead>
      <tbody>${categorySummaryRows}</tbody>
    </table>
  </div>

  <table class="main-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Category</th>
        <th>Amount</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>${expenseRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3">Total (${expenses.length} records)</td>
        <td>$${total.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">Expense Tracker &mdash; ${title}</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

// ─── Download helpers ─────────────────────────────────────────────────────────

export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function openPrintWindow(html: string): void {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow pop-ups to export PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
