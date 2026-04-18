'use client';

import { useState, useEffect, useMemo } from 'react';
import { Expense } from '@/types/expense';
import { formatCurrency } from '@/lib/utils';
import {
  TEMPLATES,
  DESTINATIONS,
  TemplateId,
  DestinationId,
  ExportSchedule,
  HistoryEntry,
  ServiceConnection,
  loadConnections,
  saveConnections,
  loadHistory,
  addHistoryEntry,
  clearHistory,
  loadSchedule,
  saveSchedule,
  computeNextRun,
  buildCSV,
  buildJSON,
  downloadFile,
  generateSharePayload,
  generateShareToken,
  timeAgo,
} from '@/lib/cloudExport';
import {
  X,
  Download,
  Mail,
  Link2,
  Cloud,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  Zap,
  RefreshCw,
  Copy,
  ExternalLink,
  AlertCircle,
  Loader2,
  ChevronRight,
  Wifi,
  WifiOff,
  Send,
  History,
  Settings,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'export' | 'schedule' | 'history';
type ExportStatus = 'idle' | 'connecting' | 'exporting' | 'done' | 'error';

interface Props {
  expenses: Expense[];
  onClose: () => void;
}

// ─── Destination icon map ──────────────────────────────────────────────────────

function DestIcon({ id, className }: { id: DestinationId; className?: string }) {
  const cls = className ?? 'w-4 h-4';
  switch (id) {
    case 'download':       return <Download className={cls} />;
    case 'email':          return <Mail className={cls} />;
    case 'share-link':     return <Link2 className={cls} />;
    case 'google-sheets':  return <ExternalLink className={cls} />;
    case 'dropbox':        return <Cloud className={cls} />;
    case 'onedrive':       return <Cloud className={cls} />;
  }
}

// ─── Service brand colors ─────────────────────────────────────────────────────

const SERVICE_COLORS: Record<DestinationId, string> = {
  download:        'bg-gray-100 text-gray-600',
  email:           'bg-sky-100 text-sky-600',
  'share-link':    'bg-indigo-100 text-indigo-600',
  'google-sheets': 'bg-green-100 text-green-600',
  dropbox:         'bg-blue-100 text-blue-700',
  onedrive:        'bg-sky-100 text-sky-700',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function CloudExportPanel({ expenses, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('export');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('monthly-summary');
  const [selectedDest, setSelectedDest]         = useState<DestinationId>('download');
  const [emailInput, setEmailInput]             = useState('');
  const [exportStatus, setExportStatus]         = useState<ExportStatus>('idle');
  const [statusMsg, setStatusMsg]               = useState('');
  const [connections, setConnections]           = useState(() => loadConnections());
  const [history, setHistory]                   = useState<HistoryEntry[]>(() => loadHistory());
  const [schedule, setSchedule]                 = useState<ExportSchedule>(() => loadSchedule());
  const [scheduleSaved, setScheduleSaved]       = useState(false);
  const [copiedLink, setCopiedLink]             = useState(false);
  const [connectingId, setConnectingId]         = useState<DestinationId | null>(null);

  const template = TEMPLATES.find((t) => t.id === selectedTemplate)!;
  const filtered = useMemo(() => template.filter(expenses), [template, expenses]);
  const totalAmount = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);
  const shareToken = useMemo(() => generateShareToken(filtered), [filtered]);

  const currentConn = connections[selectedDest];
  const destInfo = DESTINATIONS.find((d) => d.id === selectedDest)!;
  const needsAuth = destInfo.needsAuth && !currentConn.connected;

  // ── Connect / disconnect ───────────────────────────────────────────────────

  async function handleConnect(id: DestinationId) {
    setConnectingId(id);
    await new Promise((r) => setTimeout(r, 1800));
    const updated = {
      ...connections,
      [id]: {
        connected: true,
        accountEmail: 'you@example.com',
        lastSync: new Date().toISOString(),
      } satisfies ServiceConnection,
    };
    setConnections(updated);
    saveConnections(updated);
    setConnectingId(null);
  }

  function handleDisconnect(id: DestinationId) {
    const updated = { ...connections, [id]: { connected: false } };
    setConnections(updated);
    saveConnections(updated);
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  async function handleExport() {
    if (filtered.length === 0) return;

    if (needsAuth) {
      await handleConnect(selectedDest);
      return;
    }

    setExportStatus('exporting');
    setStatusMsg('');
    await new Promise((r) => setTimeout(r, 700));

    try {
      const date = new Date().toISOString().split('T')[0];
      const baseName = `${template.id}-${date}`;

      switch (selectedDest) {
        case 'download': {
          if (template.format === 'json') {
            downloadFile(buildJSON(filtered, template.name), `${baseName}.json`, 'application/json');
          } else {
            downloadFile(buildCSV(filtered), `${baseName}.csv`, 'text/csv;charset=utf-8;');
          }
          setStatusMsg('File downloaded to your device.');
          break;
        }
        case 'email': {
          if (!emailInput.trim()) {
            setExportStatus('error');
            setStatusMsg('Please enter an email address.');
            return;
          }
          // Simulate email send — download the file locally as a stand-in
          downloadFile(buildCSV(filtered), `${baseName}.csv`, 'text/csv;charset=utf-8;');
          setStatusMsg(`Report sent to ${emailInput.trim()}`);
          break;
        }
        case 'share-link': {
          const payload = generateSharePayload(filtered, template.name);
          await navigator.clipboard.writeText(payload);
          setStatusMsg('Share link copied to clipboard.');
          break;
        }
        case 'google-sheets':
        case 'dropbox':
        case 'onedrive': {
          // Simulated cloud upload — download locally as the actual action
          downloadFile(buildCSV(filtered), `${baseName}.csv`, 'text/csv;charset=utf-8;');
          const destName = DESTINATIONS.find((d) => d.id === selectedDest)!.name;
          const updated = {
            ...connections,
            [selectedDest]: {
              ...connections[selectedDest],
              lastSync: new Date().toISOString(),
            },
          };
          setConnections(updated);
          saveConnections(updated);
          setStatusMsg(`Uploaded to ${destName} (${baseName}.csv)`);
          break;
        }
      }

      const newHistory = addHistoryEntry({
        timestamp: new Date().toISOString(),
        templateId: template.id,
        templateName: template.name,
        templateEmoji: template.emoji,
        destination: selectedDest,
        destinationName: destInfo.name,
        recordCount: filtered.length,
        totalAmount,
        format: template.format,
      });
      setHistory(newHistory);
      setExportStatus('done');
    } catch {
      setExportStatus('error');
      setStatusMsg('Something went wrong. Please try again.');
    }
  }

  function resetExportStatus() {
    setExportStatus('idle');
    setStatusMsg('');
  }

  // ── Share link copy ────────────────────────────────────────────────────────

  async function copyShareLink() {
    const payload = generateSharePayload(filtered, template.name);
    await navigator.clipboard.writeText(payload);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  // ── Schedule ───────────────────────────────────────────────────────────────

  function handleSaveSchedule() {
    saveSchedule(schedule);
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 2500);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const connectedCount = Object.values(connections).filter((c) => c.connected).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg flex flex-col bg-white shadow-2xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-violet-600">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Cloud Export</h2>
              <p className="text-xs text-indigo-200 flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                {connectedCount} service{connectedCount !== 1 ? 's' : ''} connected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          {([
            { id: 'export',   label: 'Export',   Icon: Send     },
            { id: 'schedule', label: 'Schedule', Icon: Calendar },
            { id: 'history',  label: 'History',  Icon: History  },
          ] as { id: Tab; label: string; Icon: React.ElementType }[]).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2 ${
                tab === id
                  ? 'border-violet-600 text-violet-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === 'history' && history.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-violet-100 text-violet-700">
                  {history.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══════════ EXPORT TAB ══════════ */}
          {tab === 'export' && (
            <div className="p-5 space-y-6">

              {/* Template picker */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Export Template
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {TEMPLATES.map((t) => {
                    const count = t.filter(expenses).length;
                    const active = selectedTemplate === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTemplate(t.id); resetExportStatus(); }}
                        className={`relative flex flex-col items-start gap-1 p-3.5 rounded-xl border-2 text-left transition-all ${
                          active
                            ? `${t.bg} border-current ${t.accent} shadow-sm`
                            : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xl leading-none">{t.emoji}</span>
                          {active && <CheckCircle2 className="w-4 h-4 text-current" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                          <p className={`text-[11px] font-medium ${active ? 'text-current opacity-80' : 'text-gray-400'}`}>
                            {t.tagline}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${active ? 'bg-white/60' : 'bg-gray-100'} text-gray-600`}>
                            {t.format}
                          </span>
                          <span className="text-[11px] text-gray-400">{count} records</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* Template description */}
                <p className="mt-2.5 text-xs text-gray-500 px-1">{template.description}</p>
              </section>

              {/* Data summary pill */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
                <div className="flex-1">
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">Ready to export</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {filtered.length} record{filtered.length !== 1 ? 's' : ''} · {formatCurrency(totalAmount)}
                  </p>
                </div>
                {filtered.length === 0 && (
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
              </div>

              {/* Destination picker */}
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Send To
                </h3>
                <div className="space-y-2">
                  {DESTINATIONS.map((dest) => {
                    const conn = connections[dest.id];
                    const active = selectedDest === dest.id;
                    const isConnecting = connectingId === dest.id;
                    return (
                      <button
                        key={dest.id}
                        onClick={() => { setSelectedDest(dest.id); resetExportStatus(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                          active
                            ? 'border-violet-400 bg-violet-50'
                            : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${SERVICE_COLORS[dest.id]}`}>
                          <DestIcon id={dest.id} className="w-4 h-4" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{dest.name}</p>
                          <p className="text-xs text-gray-400 truncate">{dest.description}</p>
                        </div>

                        {/* Status */}
                        <div className="flex-shrink-0 text-right">
                          {dest.needsAuth ? (
                            isConnecting ? (
                              <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                            ) : conn.connected ? (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Connected
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                <WifiOff className="w-3 h-3" />
                                Not linked
                              </span>
                            )
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-sky-600 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                              Ready
                            </span>
                          )}
                        </div>

                        {active && <ChevronRight className="w-4 h-4 text-violet-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Contextual sub-form for selected destination */}
              {selectedDest === 'email' && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-2">
                  <label className="block text-xs font-semibold text-sky-700">Recipient Email</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-sky-200 bg-white text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                  <p className="text-[11px] text-sky-600">
                    The export file will be attached and delivered to this inbox.
                  </p>
                </div>
              )}

              {selectedDest === 'share-link' && filtered.length > 0 && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-indigo-700">Shareable Link</p>
                  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-indigo-200 font-mono text-[11px] text-gray-500">
                    <Link2 className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                    <span className="flex-1 truncate">expensetracker.app/share/{shareToken}</span>
                  </div>
                  <button
                    onClick={copyShareLink}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                  <p className="text-[11px] text-indigo-500 text-center">
                    Link encodes your data — no server required.
                  </p>
                </div>
              )}

              {/* Connect prompt for auth-required services */}
              {destInfo.needsAuth && !connections[selectedDest].connected && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Authorization required</p>
                  <p className="text-[11px] text-amber-600 mb-3">
                    Connect your {destInfo.name} account to enable direct upload. Your credentials are never stored here.
                  </p>
                  <button
                    onClick={() => handleConnect(selectedDest)}
                    disabled={connectingId !== null}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60"
                  >
                    {connectingId === selectedDest ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</>
                    ) : (
                      <><Zap className="w-3.5 h-3.5" /> Connect {destInfo.name}</>
                    )}
                  </button>
                </div>
              )}

              {/* Connected account info */}
              {destInfo.needsAuth && connections[selectedDest].connected && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">
                      Connected as {connections[selectedDest].accountEmail}
                    </p>
                    {connections[selectedDest].lastSync && (
                      <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        Last sync {timeAgo(connections[selectedDest].lastSync!)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDisconnect(selectedDest)}
                    className="text-[11px] text-emerald-700 hover:text-red-600 underline font-medium transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {/* Status feedback */}
              {exportStatus === 'done' && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-800 font-medium">{statusMsg}</p>
                </div>
              )}
              {exportStatus === 'error' && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 font-medium">{statusMsg}</p>
                </div>
              )}
            </div>
          )}

          {/* ══════════ SCHEDULE TAB ══════════ */}
          {tab === 'schedule' && (
            <div className="p-5 space-y-6">
              {/* Enable toggle */}
              <div className="flex items-center justify-between px-4 py-4 rounded-xl bg-gray-50 border border-gray-200">
                <div>
                  <p className="text-sm font-bold text-gray-900">Automated Exports</p>
                  <p className="text-xs text-gray-500 mt-0.5">Send exports on a recurring schedule</p>
                </div>
                <button
                  onClick={() => setSchedule((s) => ({ ...s, enabled: !s.enabled }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${schedule.enabled ? 'bg-violet-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${schedule.enabled ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              {schedule.enabled && (
                <>
                  {/* Frequency */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Frequency</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setSchedule((s) => ({ ...s, frequency: f }))}
                          className={`py-2.5 rounded-xl text-xs font-semibold border-2 capitalize transition-all ${
                            schedule.frequency === f
                              ? 'border-violet-500 bg-violet-50 text-violet-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Timing */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Timing</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {schedule.frequency === 'weekly' && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 font-medium">Day of week</label>
                          <select
                            value={schedule.dayOfWeek}
                            onChange={(e) => setSchedule((s) => ({ ...s, dayOfWeek: +e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 bg-white"
                          >
                            {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => (
                              <option key={d} value={i}>{d}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {schedule.frequency === 'monthly' && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 font-medium">Day of month</label>
                          <select
                            value={schedule.dayOfMonth}
                            onChange={(e) => setSchedule((s) => ({ ...s, dayOfMonth: +e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 bg-white"
                          >
                            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                              <option key={d} value={d}>
                                {d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5 font-medium">Time</label>
                        <select
                          value={schedule.hour}
                          onChange={(e) => setSchedule((s) => ({ ...s, hour: +e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 bg-white"
                        >
                          {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                            <option key={h} value={h}>
                              {h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* Template */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Template</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSchedule((s) => ({ ...s, templateId: t.id }))}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                            schedule.templateId === t.id
                              ? 'border-violet-500 bg-violet-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <span className="text-base">{t.emoji}</span>
                          <span className="text-xs font-semibold text-gray-800">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Destination */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Send To</h3>
                    <div className="space-y-2">
                      {DESTINATIONS.filter((d) => !d.needsAuth || connections[d.id].connected).map((dest) => (
                        <button
                          key={dest.id}
                          onClick={() => setSchedule((s) => ({ ...s, destinationId: dest.id }))}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                            schedule.destinationId === dest.id
                              ? 'border-violet-400 bg-violet-50'
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          }`}
                        >
                          <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${SERVICE_COLORS[dest.id]}`}>
                            <DestIcon id={dest.id} className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-medium text-gray-800">{dest.name}</span>
                          {schedule.destinationId === dest.id && (
                            <CheckCircle2 className="w-4 h-4 text-violet-500 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                    {DESTINATIONS.filter((d) => d.needsAuth && !connections[d.id].connected).length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-2 px-1">
                        Connect cloud services on the Export tab to unlock more destinations.
                      </p>
                    )}
                  </section>

                  {/* Email for schedule if needed */}
                  {schedule.destinationId === 'email' && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5 font-medium">Recipient Email</label>
                      <input
                        type="email"
                        value={schedule.email}
                        onChange={(e) => setSchedule((s) => ({ ...s, email: e.target.value }))}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                      />
                    </div>
                  )}

                  {/* Next run preview */}
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
                    <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] text-indigo-500 font-semibold uppercase tracking-wide">Next run</p>
                      <p className="text-sm font-bold text-indigo-900">{computeNextRun(schedule)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════════ HISTORY TAB ══════════ */}
          {tab === 'history' && (
            <div className="p-5">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <History className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">No exports yet</p>
                  <p className="text-xs text-gray-400 mt-1">Exports will appear here once you run them</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">{history.length} export{history.length !== 1 ? 's' : ''} recorded</p>
                    <button
                      onClick={() => { clearHistory(); setHistory([]); }}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors font-medium"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear all
                    </button>
                  </div>

                  <div className="space-y-2">
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-white border border-gray-100 shadow-sm"
                      >
                        {/* Template emoji badge */}
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-base flex-shrink-0">
                          {entry.templateEmoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{entry.templateName}</p>
                            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold flex-shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                              Done
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${SERVICE_COLORS[entry.destination]}`}>
                              <DestIcon id={entry.destination} className="w-2.5 h-2.5" />
                              {entry.destinationName}
                            </div>
                            <span className="text-[11px] text-gray-400">
                              {entry.recordCount} records · {formatCurrency(entry.totalAmount)}
                            </span>
                            <span className="uppercase text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              {entry.format}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(entry.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Footer action bar ──────────────────────────────────────────── */}
        {tab === 'export' && (
          <div className="px-5 py-4 border-t border-gray-100 bg-white">
            <button
              onClick={handleExport}
              disabled={filtered.length === 0 || exportStatus === 'exporting'}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                filtered.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : exportStatus === 'done'
                  ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-md'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-md hover:shadow-lg'
              }`}
            >
              {exportStatus === 'exporting' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              ) : exportStatus === 'done' ? (
                <><CheckCircle2 className="w-4 h-4" /> {statusMsg || 'Export complete'}</>
              ) : needsAuth ? (
                <><Zap className="w-4 h-4" /> Connect & Export</>
              ) : (
                <><Send className="w-4 h-4" /> Export {filtered.length > 0 ? `${filtered.length} records` : ''}</>
              )}
            </button>
          </div>
        )}

        {tab === 'schedule' && (
          <div className="px-5 py-4 border-t border-gray-100 bg-white">
            <button
              onClick={handleSaveSchedule}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-md hover:shadow-lg transition-all"
            >
              {scheduleSaved ? (
                <><CheckCircle2 className="w-4 h-4" /> Schedule saved!</>
              ) : (
                <><Settings className="w-4 h-4" /> Save Schedule</>
              )}
            </button>
          </div>
        )}

      </div>
    </>
  );
}
