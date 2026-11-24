import { Copy, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatTimestamp } from '../lib/api';
import type { AuditLogEntry, AuditLogSource } from '../types';

interface AuditLogsPageProps {
  logs: AuditLogEntry[];
  onClearLogs: () => Promise<void>;
}

export function AuditLogsPage({ logs, onClearLogs }: AuditLogsPageProps) {
  const [sourceFilter, setSourceFilter] = useState<'ALL' | AuditLogSource>('ALL');
  const [search, setSearch] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const filtered = useMemo(() => {
    return logs.filter((entry) => {
      if (sourceFilter !== 'ALL' && entry.source !== sourceFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          entry.message.toLowerCase().includes(q) ||
          (entry.detail || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, sourceFilter, search]);

  const handleCopy = async () => {
    const text = filtered
      .map((l) => `[${formatTimestamp(l.timestamp)}] [${l.level}] [${l.source}] ${l.message}${l.detail ? ` (${l.detail})` : ''}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-x-auto">
          {(['ALL', 'Manifest', 'Policy', 'License', 'ClientAPI'] as const).map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setSourceFilter(src)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                sourceFilter === src
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {src}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter audit trail…"
              className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)]"
            />
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-primary)] whitespace-nowrap"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={onClearLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-hairline)] hover:border-red-500/40 text-xs font-medium text-[var(--text-secondary)] hover:text-red-500 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            No audit events recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-hairline)] font-mono text-xs">
            {filtered.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                <span className="text-[var(--text-muted)] tabular-nums shrink-0">
                  {formatTimestamp(entry.timestamp)}
                </span>
                <span
                  className={`font-semibold shrink-0 w-12 ${
                    entry.level === 'ERROR'
                      ? 'text-red-500'
                      : entry.level === 'WARN'
                        ? 'text-amber-500'
                        : 'text-emerald-500'
                  }`}
                >
                  {entry.level}
                </span>
                <span className="text-[var(--text-secondary)] shrink-0 w-24">{entry.source}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[var(--text-primary)] break-words">{entry.message}</div>
                  {entry.detail && (
                    <div className="mt-0.5 text-[var(--text-muted)] truncate">{entry.detail}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
