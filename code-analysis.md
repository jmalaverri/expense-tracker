# Export Feature — Code Analysis

**Branches compared:** `feature-data-export-v1` · `feature-data-export-v2` · `feature-data-export-v3`  
**Analysis date:** 2026-04-18  
**Analyst:** Code review via git branch inspection

---

## Quick Reference

| Dimension              | V1 — Simple          | V2 — Advanced Modal     | V3 — Cloud Panel         |
|------------------------|----------------------|-------------------------|--------------------------|
| Files changed          | 2                    | 3                       | 3                        |
| Net lines added        | ~21                  | ~623                    | ~1,126                   |
| New components         | 0                    | 2                       | 2                        |
| Export formats         | CSV only             | CSV, JSON, PDF          | CSV, JSON                |
| Filtering              | None                 | Date range + categories | Template-based           |
| UI pattern             | Inline button        | Centered modal          | Right-side drawer        |
| State management       | None (stateless)     | Local useState          | Local useState + localStorage |
| Persistence            | None                 | None                    | History, schedule, connections |
| Zero-dependency        | Yes                  | Yes                     | Yes                      |
| Time-to-export (UX)    | Instant              | 1 click → configure → export | 2 clicks → configure → export |

---

## Version 1 — Simple Export

### Files Created / Modified

| File | Change Type | Delta |
|------|-------------|-------|
| `app/page.tsx` | Modified | +17 / -8 |
| `lib/utils.ts` | Modified | +4 / -4 (column order fix) |

### Architecture Overview

V1 is a **zero-abstraction** implementation. The export function lives in `lib/utils.ts` alongside other pure utility functions (`formatCurrency`, `filterExpenses`, etc.). The dashboard imports it directly and calls it inline from a button's `onClick`. No new files, no new components, no new state.

```
app/page.tsx
  └── onClick={() => exportToCSV(expenses)}
        └── lib/utils.ts :: exportToCSV()
              └── Blob → ObjectURL → <a> click → revokeObjectURL
```

### Key Function: `exportToCSV`

```typescript
export function exportToCSV(expenses: Expense[]): void {
  const headers = ['Date', 'Category', 'Amount', 'Description'];
  const rows = expenses.map((e) => [
    e.date, e.category, e.amount.toFixed(2),
    `"${e.description.replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `expenses-${getTodayString()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

**Technical notes:**
- All descriptions are unconditionally wrapped in double-quotes. This is RFC 4180 compliant but slightly wasteful — it adds quotes even when the field has no special characters.
- `URL.revokeObjectURL` is called synchronously after click, which is safe because the browser's download begins before the revocation in practice (the URL is claimed by the anchor before the JS engine resumes).
- The function is `void` — no return value, no error surface, no loading state.

### Libraries & Dependencies

None beyond what the project already uses. Uses native browser APIs: `Blob`, `URL.createObjectURL`, `URL.revokeObjectURL`, `document.createElement`.

### Implementation Patterns

- **Co-location of logic with utilities**: The export function lives next to `formatCurrency`, `filterExpenses`, etc. This is pragmatic but blurs the boundary between domain utilities and side-effect operations (file download is a side effect).
- **Stateless function call**: `exportToCSV` takes data in and produces a side effect. There is nothing to test in isolation (the side effect requires a DOM).
- **No async**: The entire operation is synchronous, which works fine for the data volumes typical of a personal expense tracker.

### State Management

None. The button in `page.tsx` calls `exportToCSV(expenses)` directly. `expenses` comes from the `useExpenses` hook that already exists on the page. No new state is introduced.

### Error Handling

None. Potential failure points with no handling:
- `Blob` constructor failure (e.g., out of memory)
- `URL.createObjectURL` returning `null` in edge cases
- Browser blocking the programmatic click

### Security Considerations

**Low risk.** The only output is a downloaded file — there is no rendering of user-controlled data into the DOM. CSV injection (formula injection) is a theoretical concern: if a description begins with `=`, `-`, `+`, or `@`, a naive spreadsheet application may interpret it as a formula. V1 does not sanitize for this. This is an accepted risk for personal data tools where the user is both the author and the consumer.

### Performance

- **Time complexity:** O(n) for map and join. Negligible for any realistic expense dataset.
- **Memory:** One string allocation for the full CSV. For 10,000 expenses at ~100 bytes each, this is ~1MB — fine.
- **No render impact:** The export call happens outside React's render cycle. No re-renders are triggered.

### Extensibility & Maintainability

**Low extensibility by design.** Adding a new format (e.g., JSON) requires either modifying `exportToCSV` (breaking the single-responsibility principle) or adding a new parallel function. The function name is format-specific (`exportToCSV`), making it a poor base for extension.

Maintainability is excellent: the code is 17 lines, self-contained, and understandable in seconds.

---

## Version 2 — Advanced Export Modal

### Files Created / Modified

| File | Change Type | Delta |
|------|-------------|-------|
| `app/page.tsx` | Modified | +25 / -10 |
| `components/ExportModal.tsx` | Created | +413 |
| `lib/exporters.ts` | Created | +195 |

### Architecture Overview

V2 applies a clean **separation of concerns**: business logic (building file content, triggering downloads) lives in `lib/exporters.ts`; all UI lives in `components/ExportModal.tsx`; the dashboard is only responsible for mounting/unmounting the modal.

```
app/page.tsx
  ├── useState(showExport)
  └── <ExportModal expenses={expenses} onClose={…} />
        ├── lib/exporters.ts :: filterForExport()   ← pure function
        ├── lib/exporters.ts :: buildCSV()           ← pure function
        ├── lib/exporters.ts :: buildJSON()          ← pure function
        ├── lib/exporters.ts :: buildPDFHtml()       ← pure function (returns string)
        ├── lib/exporters.ts :: downloadBlob()       ← side effect
        └── lib/exporters.ts :: openPrintWindow()    ← side effect
```

All content builders (`buildCSV`, `buildJSON`, `buildPDFHtml`) are **pure functions** — they take data and return a string with no side effects. Only `downloadBlob` and `openPrintWindow` produce side effects. This makes the builders independently testable.

### Key Components

#### `lib/exporters.ts`

| Export | Type | Purpose |
|--------|------|---------|
| `ExportFormat` | type | `'csv' \| 'json' \| 'pdf'` |
| `filterForExport()` | pure fn | Applies date range + category filter, sorts desc |
| `escapeCSVField()` | private fn | RFC 4180-compliant: quotes only when necessary |
| `buildCSV()` | pure fn | Returns CSV string |
| `buildJSON()` | pure fn | Returns JSON with `exported`, `count`, `total` envelope |
| `buildPDFHtml()` | pure fn | Returns complete HTML document string with print CSS |
| `downloadBlob()` | side-effect fn | Blob → ObjectURL → anchor click → revoke |
| `openPrintWindow()` | side-effect fn | `window.open` → `document.write` → `window.print()` |

Notable improvement over V1: `escapeCSVField` only quotes fields that actually contain commas, quotes, or newlines, rather than unconditionally quoting every description.

The `buildPDFHtml` function generates a full standalone HTML document with embedded CSS, a category summary table, striped rows, and a print media query. The document includes `<script>window.onload = function() { window.print(); }</script>` to auto-trigger the print dialog.

#### `components/ExportModal.tsx`

A centered modal dialog (~413 lines) with the following internal layout:

```
ExportModal
├── Backdrop (closes on click)
├── Panel (max-w-2xl, max-h-92vh, flex column)
│   ├── Header (title + close button)
│   ├── Scrollable body
│   │   ├── Format selector (3 cards: CSV / JSON / PDF)
│   │   ├── Date range (dateFrom, dateTo inputs)
│   │   ├── Category chips (toggle individual categories)
│   │   ├── Filename input (auto-populated by useEffect)
│   │   ├── Summary banner (record count, total, avg — amber if empty)
│   │   └── Preview table (first 8 rows, expand/collapse toggle)
│   └── Footer (Cancel + Export button with states)
```

### State Management

V2 introduces meaningful local state inside the modal:

```typescript
const [format, setFormat]                   = useState<ExportFormat>('csv');
const [dateFrom, setDateFrom]               = useState('');
const [dateTo, setDateTo]                   = useState('');
const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
const [filename, setFilename]               = useState('');
const [exportState, setExportState]         = useState<ExportState>('idle');
const [showAllPreview, setShowAllPreview]   = useState(false);
```

**Derived state via `useMemo`:**
```typescript
const filtered    = useMemo(() => filterForExport(expenses, dateFrom, dateTo, selectedCategories), [...]);
const totalAmount = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);
const previewRows = showAllPreview ? filtered : filtered.slice(0, PREVIEW_LIMIT);
```

`useMemo` ensures expensive filter/sort operations only re-run when dependencies change, not on every render triggered by other state changes (e.g., `showAllPreview` toggling).

**Export state machine:**
```
idle → exporting → done → idle (after 1400ms)
                 → error (on exception)
```

The transition from `done` back to `idle` uses `setTimeout` inside an async function, which is a simple but effective approach for transient feedback states. The artificial 600ms `exporting` delay makes the loading indicator visible even for small datasets.

**`useEffect` for filename:**
```typescript
useEffect(() => {
  const today = new Date().toISOString().split('T')[0];
  const suffix = dateFrom && dateTo ? `_${dateFrom}_to_${dateTo}` : `_${today}`;
  setFilename(`expenses${suffix}`);
}, [format, dateFrom, dateTo]);
```

This keeps the filename suggestion up-to-date as the user adjusts filters. Since `format` is a dependency but the filename doesn't actually include format info, this causes a redundant update when only format changes — a minor bug (no visible impact since the result is the same string).

### Libraries & Dependencies

Zero new dependencies. Uses native browser APIs:
- `Blob`, `URL.createObjectURL`, `URL.revokeObjectURL` (download)
- `window.open`, `document.write`, `window.print` (PDF)
- `lucide-react` icons (already a project dependency)

### Error Handling

Better than V1, but still partial:

| Scenario | Handling |
|----------|----------|
| No records match filters | Export button disabled; amber banner shown |
| PDF pop-up blocked | `alert()` with user message |
| Empty filename input | Falls back to `'expenses'` as default |
| Export function throws | Caught in try/catch: sets `exportState = 'error'` |

The `try/catch` around the export switch is the most important addition — V2 is the first version that can surface errors to the user.

### Security Considerations

**Medium risk — XSS in PDF output.** `buildPDFHtml` embeds expense fields directly into an HTML string:

```typescript
const expenseRows = expenses.map((e) => `
  <tr>
    <td>${e.date}</td>
    <td><span class="badge badge-${e.category.toLowerCase()}">${e.category}</span></td>
    <td ...>$${e.amount.toFixed(2)}</td>
    <td>${e.description}</td>   <!-- ⚠ unescaped -->
  </tr>`).join('');
```

If a description contains HTML like `<script>alert(1)</script>` or `<img src=x onerror=...>`, it will execute in the print window. Since this is a personal expense tracker where the user authors their own data, this is a self-XSS scenario with no cross-user impact. However, if this code were used in a multi-user context, it would be a real vulnerability. The fix is to escape `<`, `>`, `&`, `"` before interpolation.

The `e.category.toLowerCase()` insertion into a CSS class name is safe as long as categories are limited to known values (they are — enforced by the `Category` type).

**CSV injection:** Same concern as V1. No formula prefix sanitization.

### Performance

- `useMemo` prevents redundant re-computation of filtered data on unrelated state changes.
- Preview pagination (`PREVIEW_LIMIT = 8`) avoids rendering hundreds of table rows.
- The 600ms simulated delay is artificially imposed — the actual export is still synchronous.
- `buildPDFHtml` performs category aggregation inline (O(n) loop) and sort (O(k log k) where k = unique categories ≤ 6). Negligible.

### Extensibility & Maintainability

**High extensibility.** Adding a new format requires:
1. Adding an entry to `FORMAT_OPTIONS` array in `ExportModal.tsx`
2. Adding a `buildXxx()` function in `lib/exporters.ts`
3. Adding a case to the `switch` in `handleExport`

The pure builder functions in `lib/exporters.ts` are independently testable and reusable. The `filterForExport` function in particular is a clean, composable primitive.

Maintainability cost is the modal's length (~413 lines in one file). It handles format selection, filtering, filename management, preview, and the export action — six distinct concerns in one component. Splitting into sub-components would improve readability.

---

## Version 3 — Cloud-Integrated Export

### Files Created / Modified

| File | Change Type | Delta |
|------|-------------|-------|
| `app/page.tsx` | Modified | +25 / -10 |
| `components/CloudExportPanel.tsx` | Created | +815 |
| `lib/cloudExport.ts` | Created | +296 |

### Architecture Overview

V3 introduces the concept of **export as a service**: templates, destinations, connection state, history, and scheduling are all first-class entities with their own data shapes, CRUD operations, and localStorage persistence. The UI is a full-height right-side drawer with three independent tabs.

```
app/page.tsx
  ├── useState(showExport)
  └── <CloudExportPanel expenses={expenses} onClose={…} />
        ├── Tab: Export
        │   ├── Template picker → lib/cloudExport :: TEMPLATES[].filter()
        │   ├── Destination picker → lib/cloudExport :: DESTINATIONS[]
        │   ├── Connection management → loadConnections / saveConnections
        │   └── handleExport() → buildCSV | buildJSON | downloadFile | generateSharePayload
        ├── Tab: Schedule
        │   └── Schedule form → loadSchedule / saveSchedule / computeNextRun
        └── Tab: History
              └── History list → loadHistory / addHistoryEntry / clearHistory
```

### Key Components

#### `lib/cloudExport.ts` (296 lines)

The library is organized into six cohesive sections:

| Section | Exports | Purpose |
|---------|---------|---------|
| Templates | `TEMPLATES`, `ExportTemplate`, `TemplateId` | 4 named export configurations with embedded filter functions |
| Destinations | `DESTINATIONS`, `Destination`, `DestinationId` | 6 delivery targets, flagged by auth requirement |
| Connections | `loadConnections`, `saveConnections`, `ServiceConnection` | localStorage-backed OAuth connection state |
| History | `loadHistory`, `addHistoryEntry`, `clearHistory`, `timeAgo` | localStorage-backed audit log (capped at 30 entries) |
| Schedule | `loadSchedule`, `saveSchedule`, `computeNextRun`, `ExportSchedule` | localStorage-backed recurring export config |
| Builders | `buildCSV`, `buildJSON`, `downloadFile`, `generateSharePayload`, `generateShareToken` | Pure content builders and download side-effects |

**Template system — notable design:**

Each template embeds its own filter function as a property:

```typescript
export interface ExportTemplate {
  id: TemplateId;
  filter: (expenses: Expense[]) => Expense[];  // ← strategy pattern
  format: 'csv' | 'json';
  // ...visual metadata (emoji, accent, bg)
}
```

This is the **Strategy pattern**: the template object carries its own data transformation strategy. Calling `template.filter(expenses)` produces the correctly sorted and filtered slice without any conditional logic at the call site. Adding a new template is purely additive — no existing code changes.

**`computeNextRun` — scheduling logic:**

```typescript
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
  // ...format and return
}
```

The weekly calculation uses modular arithmetic `(target - current + 7) % 7` to find days until the next occurrence. The `|| (next <= now ? 7 : 0)` handles the edge case where today is already the target day but the time has passed. The monthly case has a subtle bug: if `s.dayOfMonth` is 31 and the next month has fewer days, `setDate(31)` rolls over to the following month (e.g., Feb 31 → Mar 3). Capping `dayOfMonth` at 28 in the UI (the schedule form does this) avoids the issue.

**`generateSharePayload` — real shareable data:**

```typescript
export function generateSharePayload(expenses: Expense[], templateName: string): string {
  const json = buildJSON(expenses, templateName);
  return 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
}
```

This produces a genuine `data:` URI that opens as a JSON document in any browser. Unlike a server-generated share link, it requires no backend, never expires, and contains the full dataset encoded in the URL itself. The limitation is URL length (browsers support up to ~2MB in `data:` URIs; a dataset of ~500 expenses comfortably fits).

#### `components/CloudExportPanel.tsx` (815 lines)

The largest component, organized into three major render sections:

**Export tab:** Template cards (2×2 grid with live record counts), destination list with connection status badges, contextual sub-forms (email input, share link preview, connect prompt for unlinked OAuth services), status feedback banners.

**Schedule tab:** Conditional rendering based on `schedule.enabled` toggle and `schedule.frequency`. The day/time selectors are conditionally shown:
- `frequency === 'weekly'` → shows day-of-week dropdown
- `frequency === 'monthly'` → shows day-of-month dropdown  
- `frequency === 'daily'` → neither (just time)

Only connected destinations appear in the schedule destination picker — a good UX constraint that prevents saving a broken schedule.

**History tab:** Auto-populates on every successful export. Each entry shows template emoji badge, template name, destination badge (with service-specific color), record count, total, format badge, and relative timestamp.

**`DestIcon` sub-component:**

```typescript
function DestIcon({ id, className }: { id: DestinationId; className?: string }) {
  switch (id) {
    case 'download':      return <Download className={cls} />;
    case 'email':         return <Mail className={cls} />;
    case 'share-link':    return <Link2 className={cls} />;
    // ...
  }
}
```

This is a small render-only sub-component defined in the same file. It maps destination IDs to icons, centralizing the icon-to-destination mapping. This pattern avoids duplicating icon selections across the history tab, export tab destination list, and schedule tab destination list.

**`SERVICE_COLORS` lookup:**

```typescript
const SERVICE_COLORS: Record<DestinationId, string> = {
  download:        'bg-gray-100 text-gray-600',
  email:           'bg-sky-100 text-sky-600',
  'share-link':    'bg-indigo-100 text-indigo-600',
  'google-sheets': 'bg-green-100 text-green-600',
  dropbox:         'bg-blue-100 text-blue-700',
  onedrive:        'bg-sky-100 text-sky-700',
};
```

A static map keyed by `DestinationId` (a discriminated union). TypeScript enforces exhaustiveness — if a new destination is added to `DestinationId`, the map will produce a type error until it's updated. This is a compile-time safety mechanism.

### State Management

V3 has the most complex state, split across in-component React state and localStorage:

**React state (ephemeral, per-session):**
```typescript
const [tab, setTab]                 = useState<Tab>('export');
const [selectedTemplate, ...]       = useState<TemplateId>('monthly-summary');
const [selectedDest, ...]           = useState<DestinationId>('download');
const [emailInput, ...]             = useState('');
const [exportStatus, ...]           = useState<ExportStatus>('idle');
const [statusMsg, ...]              = useState('');
const [connections, ...]            = useState(() => loadConnections());   // lazy init
const [history, ...]                = useState<HistoryEntry[]>(() => loadHistory()); // lazy init
const [schedule, ...]               = useState<ExportSchedule>(() => loadSchedule()); // lazy init
const [scheduleSaved, ...]          = useState(false);
const [copiedLink, ...]             = useState(false);
const [connectingId, ...]           = useState<DestinationId | null>(null);
```

The `useState(() => loadConnections())` pattern (lazy initializer) is important: it ensures `localStorage.getItem` runs only once on mount, not on every render. Without the lazy form, `loadConnections()` would be called on every render but only the first value would be used — wasteful.

**localStorage (persistent, cross-session):**
```
expense-tracker-cloud-connections  → ConnectionMap
expense-tracker-export-history     → HistoryEntry[] (capped at 30)
expense-tracker-export-schedule    → ExportSchedule
```

**Export status machine:**
```
idle → exporting → done     (700ms simulated delay)
     → connecting → (auto-proceeds to exporting)
                  → error
```

V3 adds the `connecting` state (for OAuth flow simulation) that V2 lacks.

### Libraries & Dependencies

Zero new dependencies. Key browser APIs used:
- `localStorage` (connection state, history, schedule)
- `navigator.clipboard.writeText` (share link copy)
- `Blob`, `URL.createObjectURL` (file downloads)
- `btoa` (share token generation — browser-only, guarded by `'use client'`)

**`navigator.clipboard` caveat:** The Clipboard API requires either HTTPS or `localhost`. On an HTTP origin, `copyShareLink()` will throw a `NotAllowedError`. This is not handled. In production, this should be wrapped in try/catch with a fallback (e.g., `execCommand('copy')` or a visible text field the user can manually copy).

### Error Handling

Most comprehensive of the three:

| Scenario | Handling |
|----------|----------|
| Empty result set | Export button disabled |
| Email field blank | Sets `exportStatus = 'error'`, shows red banner |
| Clipboard API failure | **Unhandled** — throws to browser console |
| Pop-up blocked (not applicable — V3 has no PDF) | N/A |
| `localStorage` read failure | try/catch returning defaults in all load functions |
| `localStorage` write failure | **Unhandled** — `JSON.stringify` can throw on circular refs (not possible here) |
| `handleConnect` simulated failure | Not simulated — always "succeeds" after delay |

### Security Considerations

**Same CSV injection risk as V1/V2.** No formula prefix sanitization.

**No XSS risk.** V3 does not embed user data into HTML strings (no PDF generation). The `generateSharePayload` function uses `encodeURIComponent(json)` which escapes all HTML-significant characters. The share token from `generateShareToken` uses `btoa` output filtered to alphanumeric characters — safe for DOM insertion.

**localStorage as trust boundary.** Connection state, history, and schedule are stored in localStorage. A malicious script on the same origin (XSS attack) could read, modify, or delete this data. This is accepted risk for a client-only application with no actual OAuth tokens stored.

**`handleConnect` simulation:** The connect flow sets `accountEmail: 'you@example.com'` as a hard-coded placeholder. In a real implementation, this would be replaced with the actual OAuth callback flow, and real credentials would be stored server-side (not in localStorage).

### Performance

- `useMemo` for `filtered`, `totalAmount`, `shareToken` — all update only when their dependencies change.
- `useState(() => loadFn())` lazy initialization — localStorage reads occur only once on mount.
- History is capped at 30 entries — prevents unbounded localStorage growth.
- The schedule `computeNextRun` is called inline during render (not memoized). It's O(1) arithmetic, so this is fine.
- `generateShareToken` calls `btoa` on every render that depends on `filtered` — this is memoized via `useMemo`, so it only recomputes when `filtered` changes.

### Extensibility & Maintainability

**Highest extensibility.** Adding a new destination:
1. Add to the `DestinationId` union (TypeScript will flag all incomplete switch/record usages)
2. Add to `DESTINATIONS` array
3. Add to `DEFAULT_CONNECTIONS`
4. Add to `SERVICE_COLORS`
5. Add a case in `DestIcon`
6. Add a case in `handleExport`

Adding a new template is the simplest: add one object to `TEMPLATES`. No other code changes needed.

**Maintainability concern:** At 815 lines, `CloudExportPanel.tsx` is large enough to warrant splitting. The three tabs (Export, Schedule, History) are natural candidates for sub-components, which would reduce the file to ~200 lines of composition with the rest split into `ExportTab.tsx`, `ScheduleTab.tsx`, `HistoryTab.tsx`.

---

## Cross-Cutting Comparison

### CSV Generation Quality

All three versions use the RFC 4180 standard (double-quoting for special characters). V2 and V3 improve on V1 by quoting only when necessary:

| Version | Field quoting |
|---------|--------------|
| V1 | Always wraps descriptions in `"..."` |
| V2 | Quotes only if field contains `,`, `"`, or `\n` |
| V3 | Same as V2 |

V2 and V3 are more spec-correct. The difference is invisible to end users but matters for downstream parsing tools that treat quoted vs unquoted fields differently.

### Export Trigger Mechanism

All three versions use the same underlying browser download mechanism:
```
Blob(content) → URL.createObjectURL() → <a download> click → revokeObjectURL()
```

This is the correct, widely-supported approach. No version uses the deprecated `saveAs` or `msSaveBlob` APIs.

### Component Coupling

| Version | Dashboard dependency on export |
|---------|-------------------------------|
| V1 | Direct import and call: `exportToCSV(expenses)` |
| V2 | Mounts modal, passes `expenses` + `onClose` |
| V3 | Mounts panel, passes `expenses` + `onClose` |

V2 and V3 follow the same pattern: the dashboard knows only that an export panel exists and how to open/close it. The panel is fully self-contained. This is good encapsulation — the dashboard doesn't know about formats, filters, or destinations.

### Simulated vs Real Features

V3 introduces several features that are **UI mockups rather than real integrations:**

| Feature | Reality |
|---------|---------|
| Google Sheets connection | Simulates OAuth with a 1800ms delay |
| Dropbox connection | Same |
| OneDrive connection | Same |
| Email send | Downloads the file locally instead of sending |
| Cloud upload | Downloads the file locally instead of uploading |
| Scheduled exports | Persists config but no background job actually runs |

These are honestly labeled in the code with comments. The share link and download destinations are the only two that perform their stated function. This is appropriate for a frontend-only prototype but would need real backend integrations before shipping.

### localStorage Key Pollution

V3 introduces three new localStorage keys. The project already uses `expense-tracker-data`. Summary:

| Key | Owner | Size growth |
|-----|-------|-------------|
| `expense-tracker-data` | Core app | O(n) expenses |
| `expense-tracker-cloud-connections` | V3 | Fixed (~200 bytes) |
| `expense-tracker-export-history` | V3 | O(n) capped at 30 (~6KB max) |
| `expense-tracker-export-schedule` | V3 | Fixed (~150 bytes) |

No key conflicts. The `expense-tracker-` prefix convention is consistent.

---

## Recommendations

### Adopt V2 as the baseline

V2 hits the best balance of real functionality, code quality, and maintainability. The clean lib/component separation, pure builder functions, and useMemo pattern are all production-appropriate. The modal UX matches user expectations for a "configure then export" flow.

**Specific things to fix before shipping V2:**
1. HTML-escape `e.description` in `buildPDFHtml` to close the self-XSS window
2. Remove `format` from the `useEffect` dependency array for filename (it causes a spurious re-run)
3. Wrap `navigator.clipboard.writeText` in try/catch if the share link feature is ported
4. Add CSV formula injection sanitization if multi-user sharing is ever planned

### Cherry-pick from V3

Two V3 features stand out as genuinely useful additions to V2:

1. **Export history** — low cost, high value. Users often re-export and want to know what they last ran. Port `loadHistory`/`addHistoryEntry` from `lib/cloudExport.ts` and add a small history section to the modal.

2. **Templates** — the Strategy pattern with embedded filter functions is elegant. Instead of raw date/category filters, offer "Tax Report" / "Monthly Summary" as quick presets alongside the manual filter controls.

### Skip or defer from V3

- Cloud destination integrations require a real backend — defer until there's an API
- Scheduling requires a server-side job runner or service worker — defer
- The share link via `data:` URI is clever but impractical for large datasets; a backend-generated short link would be more usable
