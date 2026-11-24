import { CheckCircle2, Copy, ExternalLink, Play, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { api, formatTimestamp, isStaticPagesMode } from '../lib/api';
import type {
  AdminPageId,
  ClientBootstrapResponse,
  LicenseRecord,
  ManifestDocument,
  SdkId,
  TemplateCatalog,
} from '../types';

interface OverviewPortalPageProps {
  manifest: ManifestDocument;
  templates: TemplateCatalog;
  licenses: LicenseRecord[];
  onNavigate: (page: AdminPageId) => void;
  onRefreshState: () => Promise<void>;
}

export function OverviewPortalPage({
  manifest,
  templates,
  licenses,
  onNavigate,
  onRefreshState,
}: OverviewPortalPageProps) {
  const [clientVersion, setClientVersion] = useState<string>(manifest.application.latest_version);
  const [licenseKey, setLicenseKey] = useState<string>(licenses[0]?.key || '');
  const [handshake, setHandshake] = useState<ClientBootstrapResponse | null>(null);
  const [testing, setTesting] = useState<boolean>(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const baseUrl =
    typeof window !== 'undefined'
      ? new URL('.', window.location.href).href.replace(/\/+$/, '')
      : '';
  const staticMode = isStaticPagesMode();
  const totalSdkVersions = (Object.keys(manifest.sdks) as SdkId[]).reduce(
    (sum, id) => sum + manifest.sdks[id].versions.length,
    0,
  );
  const activeLicensesCount = licenses.filter((l) => l.status === 'active').length;

  const endpoints = [
    {
      method: 'GET',
      path: 'api/v1/manifest.json',
      purpose: 'Full SDK catalog, checksums, installation & runtime specs consumed by ManifestManager',
    },
    {
      method: 'GET',
      path: 'api/v1/templates.json',
      purpose: 'Declarative project creation steps consumed by TemplateManager',
    },
    {
      method: 'GET',
      path: 'api/v1/tools.json',
      purpose: 'Standalone & bundled tool definitions consumed by ToolManager',
    },
    {
      method: 'POST',
      path: 'api/v1/client/bootstrap',
      purpose: staticMode
        ? 'Live Express endpoint when self-hosted (simulated locally in GitHub Pages static mode)'
        : 'Desktop client startup gate checking min version, maintenance mode, and license',
    },
    {
      method: 'POST',
      path: 'api/v1/license/verify',
      purpose: staticMode
        ? 'Live Express endpoint when self-hosted (simulated locally in GitHub Pages static mode)'
        : 'License key status check returning plan, expiry, and offline grace days',
    },
  ];

  const pythonSnippet = `import requests

BASE_URL = "${baseUrl}"

# Static JSON catalogs (works on both GitHub Pages & self-hosted Express)
manifest = requests.get(f"{BASE_URL}/api/v1/manifest.json", timeout=10).json()
templates = requests.get(f"{BASE_URL}/api/v1/templates.json", timeout=10).json()
tools = requests.get(f"{BASE_URL}/api/v1/tools.json", timeout=10).json()`;

  const handleTestHandshake = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    try {
      const res = await api.testClientBootstrap({
        client_version: clientVersion,
        license_key: licenseKey,
        platform: 'windows',
      });
      setHandshake(res);
      await onRefreshState();
    } finally {
      setTesting(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 1600);
  };

  return (
    <div className="space-y-6">
      {/* 4-Column Registry Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <div className="text-xs text-[var(--text-muted)]">Latest Desktop Client</div>
          <div className="mt-1.5 text-2xl font-display font-semibold tabular-nums text-[var(--text-primary)]">
            v{manifest.application.latest_version}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)] tabular-nums">
            Minimum allowed: v{manifest.application.minimum_version}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <div className="text-xs text-[var(--text-muted)]">Published SDK Releases</div>
          <div className="mt-1.5 text-2xl font-display font-semibold tabular-nums text-[var(--text-primary)]">
            {totalSdkVersions}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            Across 4 stacks + Git & Composer
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <div className="text-xs text-[var(--text-muted)]">Project Templates</div>
          <div className="mt-1.5 text-2xl font-display font-semibold tabular-nums text-[var(--text-primary)]">
            {templates.templates.length}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            Served via /api/v1/templates.json
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <div className="text-xs text-[var(--text-muted)]">Active Licenses</div>
          <div className="mt-1.5 text-2xl font-display font-semibold tabular-nums text-[var(--text-primary)]">
            {activeLicensesCount}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)] tabular-nums">
            {manifest.license.required ? 'Enforcement ON' : 'Optional'} · {manifest.license.offline_grace_days}d grace
          </div>
        </div>
      </div>

      {/* Live Desktop Client Endpoints */}
      <section className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
              PySide6 Desktop Client Endpoints
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Live JSON endpoints served directly to your local Python + PySide6 desktop application.
            </p>
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
            Updated {formatTimestamp(manifest.generated_at)}
          </span>
        </div>

        <div className="divide-y divide-[var(--border-hairline)]">
          {endpoints.map((ep) => {
            const fullUrl = `${baseUrl}/${ep.path}`;
            return (
              <div key={ep.path} className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 text-xs font-mono">
                    <span className="font-semibold text-[var(--accent)] w-10 shrink-0">{ep.method}</span>
                    <span className="text-[var(--text-primary)] truncate">/{ep.path}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{ep.purpose}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(fullUrl, ep.path)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedEndpoint === ep.path ? 'Copied' : 'Copy URL'}</span>
                  </button>
                  {ep.method === 'GET' && (
                    <a
                      href={ep.path}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)]"
                    >
                      <span>Open JSON</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Python Client Bootstrap Simulator */}
        <section className="p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                Client Bootstrap Handshake Tester
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Verify how your PySide6 client responds to current update & license policies.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('licensing')}
              className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
            >
              Edit Policy
            </button>
          </div>

          <form onSubmit={handleTestHandshake} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Client Version</label>
              <input
                type="text"
                value={clientVersion}
                onChange={(e) => setClientVersion(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">License Key (optional)</label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="UDEV-PRO-2026-94F1"
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{testing ? 'Testing…' : 'Send POST /api/v1/client/bootstrap'}</span>
              </button>
            </div>
          </form>

          {handshake && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-medium">
                {handshake.allowed ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Client Allowed · license={handshake.license_status}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-red-500">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Client Blocked · license={handshake.license_status} · update_required={String(handshake.update_required)}</span>
                  </span>
                )}
              </div>
              <pre className="p-3 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-secondary)] overflow-x-auto">
                {JSON.stringify(handshake, null, 2)}
              </pre>
            </div>
          )}
        </section>

        {/* Python Integration Code */}
        <section className="p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                Python Client Integration Snippet
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Drop into your PySide6 `ManifestManager` / startup check.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(pythonSnippet, 'python')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)]"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedEndpoint === 'python' ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <pre className="flex-1 p-3.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)] overflow-x-auto leading-relaxed">
            {pythonSnippet}
          </pre>
        </section>
      </div>
    </div>
  );
}
