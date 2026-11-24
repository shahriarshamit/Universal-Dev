import { Copy, Download, Save, ShieldAlert, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { api, formatBytes } from '../lib/api';
import type { ManifestDocument, SdkId } from '../types';

interface ReleasesCatalogPageProps {
  manifest: ManifestDocument;
  onRefreshState: () => Promise<void>;
  onOpenPublishModal: () => void;
}

type FilterTab = 'all' | 'php' | 'node' | 'python' | 'flutter' | 'tools';

export function ReleasesCatalogPage({
  manifest,
  onRefreshState,
  onOpenPublishModal,
}: ReleasesCatalogPageProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [provider, setProvider] = useState<string>(manifest.provider);
  const [cdn, setCdn] = useState<string>(manifest.cdn);
  const [metaSaved, setMetaSaved] = useState<boolean>(false);
  const [showJson, setShowJson] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{ sdkId: SdkId; version: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sdkList = (Object.keys(manifest.sdks) as SdkId[])
    .map((id) => manifest.sdks[id])
    .filter((sdk) => {
      if (filter === 'all') return true;
      if (filter === 'tools') return sdk.category === 'tool';
      return sdk.id === filter;
    });

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.updateManifestMetadata({ provider, cdn });
      setMetaSaved(true);
      setTimeout(() => setMetaSaved(false), 1800);
      await onRefreshState();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save provider settings');
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All SDKs & Tools' },
              { id: 'php', label: 'PHP' },
              { id: 'node', label: 'Node.js' },
              { id: 'python', label: 'Python' },
              { id: 'flutter', label: 'Flutter' },
              { id: 'tools', label: 'Tools' },
            ] as Array<{ id: FilterTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowJson((v) => !v)}
            className="px-3 py-1.5 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-primary)]"
          >
            {showJson ? 'Hide manifest.json' : 'Inspect manifest.json'}
          </button>
          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-primary)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={onOpenPublishModal}
            className="px-3 py-1.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium"
          >
            New Release
          </button>
        </div>
      </div>

      {/* Registry Provider & CDN Strip */}
      <form
        onSubmit={handleSaveMeta}
        className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
      >
        <div className="md:col-span-4">
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Registry Provider</label>
          <input
            type="text"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)]"
          />
        </div>
        <div className="md:col-span-6">
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Base CDN Mirror URL</label>
          <input
            type="url"
            value={cdn}
            onChange={(e) => setCdn(e.target.value)}
            className="w-full px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-primary)]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{metaSaved ? 'Saved' : 'Save CDN'}</span>
          </button>
        </div>
      </form>

      {actionError && (
        <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10 text-xs text-red-400">
          {actionError}
        </div>
      )}

      {showJson && (
        <section className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--border-hairline)] flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              GET /api/v1/manifest.json
            </span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(JSON.stringify(manifest, null, 2));
                setCopiedJson(true);
                setTimeout(() => setCopiedJson(false), 1600);
              }}
              className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>
          <pre className="p-4 max-h-96 overflow-auto bg-[var(--bg-canvas)] font-mono text-xs text-[var(--text-secondary)]">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </section>
      )}

      {/* SDK Catalog List */}
      <div className="space-y-4">
        {sdkList.map((sdk) => (
          <section
            key={sdk.id}
            className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                  {sdk.name}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">{sdk.description}</p>
              </div>
              <div className="text-xs font-mono text-[var(--text-muted)] tabular-nums shrink-0">
                default_version: <span className="text-[var(--text-primary)]">{sdk.default_version}</span>
              </div>
            </div>

            <div className="divide-y divide-[var(--border-hairline)]">
              {sdk.versions.map((ver) => {
                const isDefault = sdk.default_version === ver.version;
                return (
                  <div
                    key={ver.version}
                    className="px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                          v{ver.version}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">·</span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {ver.channel.toUpperCase()} · {ver.platform}/{ver.architecture}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">·</span>
                        <span className="text-xs tabular-nums text-[var(--text-muted)]">
                          {formatBytes(ver.size)}
                        </span>
                        {ver.dependencies.length > 0 && (
                          <>
                            <span className="text-xs text-[var(--text-muted)]">·</span>
                            <span className="text-xs text-[var(--text-secondary)]">
                              deps: {ver.dependencies.join(', ')}
                            </span>
                          </>
                        )}
                        {isDefault && (
                          <>
                            <span className="text-xs text-[var(--text-muted)]">·</span>
                            <span className="text-xs font-medium text-emerald-500">Default</span>
                          </>
                        )}
                      </div>
                      <div className="mt-1 text-xs font-mono text-[var(--text-muted)] truncate">
                        {ver.download_url} · SHA-256 {ver.sha256.slice(0, 16)}…
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {ver.status === 'deprecated' && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-500 mr-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Deprecated</span>
                        </span>
                      )}

                      {!isDefault && (
                        <button
                          type="button"
                          onClick={async () => {
                            setActionError(null);
                            await api.patchManifestVersionState({
                              sdk_id: sdk.id,
                              version: ver.version,
                              set_default: true,
                            });
                            await onRefreshState();
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)]"
                        >
                          <Star className="w-3 h-3" />
                          <span>Set Default</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          setActionError(null);
                          await api.patchManifestVersionState({
                            sdk_id: sdk.id,
                            version: ver.version,
                            status: ver.status === 'deprecated' ? 'supported' : 'deprecated',
                          });
                          await onRefreshState();
                        }}
                        className="px-2.5 py-1.5 rounded border border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {ver.status === 'deprecated' ? 'Mark Supported' : 'Deprecate'}
                      </button>

                      <button
                        type="button"
                        disabled={isDefault || sdk.versions.length <= 1}
                        onClick={() => setDeleteTarget({ sdkId: sdk.id, version: ver.version })}
                        aria-label={`Remove ${sdk.name} ${ver.version}`}
                        className="p-1.5 rounded border border-[var(--border-hairline)] hover:border-red-500/40 disabled:opacity-35 text-[var(--text-muted)] hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Manifest Release"
        message={`Remove ${deleteTarget?.sdkId} v${deleteTarget?.version} from /api/v1/manifest.json? Desktop clients will no longer see this build in their catalog.`}
        confirmLabel="Remove Version"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            setActionError(null);
            await api.deleteManifestVersion(deleteTarget.sdkId, deleteTarget.version);
            setDeleteTarget(null);
            await onRefreshState();
          } catch (err) {
            setDeleteTarget(null);
            setActionError(err instanceof Error ? err.message : 'Unable to remove version');
          }
        }}
      />
    </div>
  );
}
