'use client';

import { useState, useMemo, useEffect } from 'react';
import { Expense, Category, CATEGORIES } from '@/types/expense';
import { formatCurrency } from '@/lib/utils';
import {
  ExportFormat,
  filterForExport,
  buildCSV,
  buildJSON,
  buildPDFHtml,
  downloadBlob,
  openPrintWindow,
} from '@/lib/exporters';
import {
  X,
  Download,
  FileText,
  FileJson,
  FileType2,
  CalendarRange,
  Tag,
  Eye,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Props {
  expenses: Expense[];
  onClose: () => void;
}

const FORMAT_OPTIONS: { id: ExportFormat; label: string; description: string; icon: React.ReactNode; ext: string }[] = [
  {
    id: 'csv',
    label: 'CSV',
    description: 'Spreadsheet-compatible, great for Excel or Sheets',
    icon: <FileText className="w-5 h-5" />,
    ext: '.csv',
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'Structured data with totals metadata, ideal for developers',
    icon: <FileJson className="w-5 h-5" />,
    ext: '.json',
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: 'Formatted report with category summary, ready to print or share',
    icon: <FileType2 className="w-5 h-5" />,
    ext: '',
  },
];

type ExportState = 'idle' | 'exporting' | 'done';

const PREVIEW_LIMIT = 8;

export default function ExportModal({ expenses, onClose }: Props) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [filename, setFilename] = useState('');
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [showAllPreview, setShowAllPreview] = useState(false);

  // Auto-generate filename when format or date changes
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const suffix = dateFrom && dateTo ? `_${dateFrom}_to_${dateTo}` : `_${today}`;
    setFilename(`expenses${suffix}`);
  }, [format, dateFrom, dateTo]);

  const filtered = useMemo(
    () => filterForExport(expenses, dateFrom, dateTo, selectedCategories),
    [expenses, dateFrom, dateTo, selectedCategories]
  );

  const totalAmount = useMemo(
    () => filtered.reduce((s, e) => s + e.amount, 0),
    [filtered]
  );

  const previewRows = showAllPreview ? filtered : filtered.slice(0, PREVIEW_LIMIT);

  function toggleCategory(cat: Category) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function selectAllCategories() {
    setSelectedCategories([]);
  }

  async function handleExport() {
    if (filtered.length === 0) return;

    setExportState('exporting');
    // Brief delay so the loading state is visible
    await new Promise((r) => setTimeout(r, 600));

    const selectedFormat = FORMAT_OPTIONS.find((f) => f.id === format)!;
    const finalName = (filename.trim() || 'expenses') + selectedFormat.ext;

    switch (format) {
      case 'csv':
        downloadBlob(buildCSV(filtered), finalName, 'text/csv;charset=utf-8;');
        break;
      case 'json':
        downloadBlob(buildJSON(filtered), finalName, 'application/json');
        break;
      case 'pdf':
        openPrintWindow(buildPDFHtml(filtered, filename.trim() || 'Expense Report'));
        break;
    }

    setExportState('done');
    await new Promise((r) => setTimeout(r, 1400));
    setExportState('idle');
  }

  const isExporting = exportState === 'exporting';
  const isDone = exportState === 'done';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-100">
              <Download className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Export Expenses</h2>
              <p className="text-xs text-gray-400">Choose format, filters, and options</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Format selector */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Export Format
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFormat(opt.id)}
                  className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                    format === opt.id
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {format === opt.id && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-violet-500" />
                  )}
                  <span
                    className={format === opt.id ? 'text-violet-600' : 'text-gray-500'}
                  >
                    {opt.icon}
                  </span>
                  <span className="font-bold text-gray-900 text-sm">{opt.label}</span>
                  <span className="text-xs text-gray-400 leading-snug">{opt.description}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Filters */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5" /> Date Range
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Categories
              </h3>
              {selectedCategories.length > 0 && (
                <button
                  onClick={selectAllCategories}
                  className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                >
                  Clear ({selectedCategories.length} selected)
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
              <span className="self-center text-xs text-gray-400 pl-1">
                {selectedCategories.length === 0 ? 'All categories' : `${selectedCategories.length} selected`}
              </span>
            </div>
          </section>

          {/* Filename */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Filename
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="expenses"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all font-mono"
              />
              <span className="text-sm text-gray-400 font-mono flex-shrink-0">
                {FORMAT_OPTIONS.find((f) => f.id === format)?.ext || '(print dialog)'}
              </span>
            </div>
          </section>

          {/* Summary banner */}
          <div
            className={`rounded-xl p-4 flex items-center justify-between transition-colors ${
              filtered.length === 0
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-violet-50 border border-violet-200'
            }`}
          >
            <div>
              <p className="text-sm font-bold text-gray-900">
                {filtered.length === 0
                  ? 'No records match your filters'
                  : `${filtered.length} record${filtered.length !== 1 ? 's' : ''} selected`}
              </p>
              {filtered.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  out of {expenses.length} total &bull; combined value{' '}
                  <span className="font-semibold text-violet-700">{formatCurrency(totalAmount)}</span>
                </p>
              )}
            </div>
            {filtered.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Avg per record</p>
                <p className="font-bold text-gray-900 text-sm">
                  {formatCurrency(totalAmount / filtered.length)}
                </p>
              </div>
            )}
          </div>

          {/* Preview table */}
          {filtered.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Preview
                </h3>
                <span className="text-xs text-gray-400">
                  Showing {previewRows.length} of {filtered.length}
                </span>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((e, i) => (
                        <tr
                          key={e.id}
                          className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                        >
                          <td className="px-4 py-2 text-gray-600 font-mono">{e.date}</td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                              {e.category}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-900">
                            {formatCurrency(e.amount)}
                          </td>
                          <td className="px-4 py-2 text-gray-600 truncate max-w-[180px]">
                            {e.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filtered.length > PREVIEW_LIMIT && (
                  <button
                    onClick={() => setShowAllPreview((v) => !v)}
                    className="w-full py-2.5 text-xs font-medium text-violet-600 hover:text-violet-800 hover:bg-violet-50 border-t border-gray-200 transition-colors flex items-center justify-center gap-1"
                  >
                    {showAllPreview ? (
                      <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                    ) : (
                      <><ChevronDown className="w-3.5 h-3.5" /> Show all {filtered.length} records</>
                    )}
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleExport}
            disabled={filtered.length === 0 || isExporting}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
              filtered.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : isDone
                ? 'bg-green-500 text-white shadow-green-200'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 hover:shadow-lg'
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting…
              </>
            ) : isDone ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {format === 'pdf' ? 'Print dialog opened' : 'Downloaded!'}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {filtered.length > 0 ? `${filtered.length} record${filtered.length !== 1 ? 's' : ''}` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
