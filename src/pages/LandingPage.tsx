import { ArrowRight, CheckCircle2, Download, KeyRound, Moon, ShieldAlert, Sun, Terminal } from 'lucide-react';
import { useState } from 'react';
import { api, formatBytes, formatTimestamp } from '../lib/api';
import type { EcosystemId, LicenseVerifyResponse, PublicPortalSummary } from '../types';

interface LandingPageProps {
  summary: PublicPortalSummary;
  theme: 'dark' | 'light';
  isAuthenticated: boolean;
  onToggleTheme: () => void;
  onOpenAdmin: () => void;
}

const ECOSYSTEM_ORDER: EcosystemId[] = ['php', 'node', 'python', 'flutter'];

const CAPABILITIES = [
  {
    num: '01',
    title: 'Zero Host-PATH Isolation',
    detail:
      'Every SDK extracts cleanly into managed workspace directories and activates via scoped environment injections inside each terminal or project runner, leaving system PATH untouched.',
  },
  {
    num: '02',
    title: 'PHP, Node.js, Python & Flutter',
    detail:
      'Switch language toolchains per project without global version managers conflicting. Bundled Git and Composer binaries keep dependencies deterministic across machines.',
  },
  {
    num: '03',
    title: 'Remote templates.json & tools.json',
    detail:
      'Scaffold Laravel, React Vite, FastAPI, or Flutter apps using manifest-driven command pipelines synced directly from this portal or static GitHub Pages JSON.',
  },
  {
    num: '04',
    title: 'Static GitHub Pages or Express Server',
    detail:
      'Serve immutable /api/v1/*.json feeds straight from GitHub Pages, or self-host the Node.js Express backend for live passphrase-protected control plane publishing and licensing.',
  },
];

export function LandingPage({
  summary,
  theme,
  isAuthenticated,
  onToggleTheme,
  onOpenAdmin,
}: LandingPageProps) {
  const { manifest, templates, tools } = summary;
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseResult, setLicenseResult] = useState<LicenseVerifyResponse | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [verifyingLicense, setVerifyingLicense] = useState(false);

  const ecosystemSdks = ECOSYSTEM_ORDER.map((id) => manifest.sdks[id]).filter(Boolean);
  const allSdks = Object.values(manifest.sdks);

  const defaultRows = allSdks.map((sdk) => {
    const versionObj = sdk.versions.find((v) => v.version === sdk.default_version) ?? sdk.versions[0];
    return { sdk, versionObj };
  });

  const handleVerifyLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = licenseKey.trim();
    if (!cleaned) {
      setLicenseError('Enter a license key to check its policy status.');
      setLicenseResult(null);
      return;
    }
    setVerifyingLicense(true);
    setLicenseError(null);
    try {
      const res = await api.verifyLicense(cleaned);
      setLicenseResult(res);
    } catch (err) {
      setLicenseError(err instanceof Error ? err.message : 'Unable to verify license key.');
      setLicenseResult(null);
    } finally {
      setVerifyingLicense(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-30 h-16 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur">
        <div className="max-w-[1280px] mx-auto h-full px-6 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-base font-semibold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0"
          >
            Universal Dev
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--text-secondary)]" aria-label="Landing navigation">
            <button
              type="button"
              onClick={() => scrollToSection('ecosystems')}
              className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              Ecosystems
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('architecture')}
              className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              Architecture
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('releases')}
              className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              Releases
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('endpoints')}
              className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              Endpoints
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-md border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <span>{isAuthenticated ? 'Open Admin' : 'Admin Login'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {manifest.application.maintenance && (
          <div className="border-b border-amber-500/30 bg-amber-500/10">
            <div className="max-w-[1280px] mx-auto px-6 py-2.5 text-xs text-amber-400">
              Maintenance Notice: {manifest.application.maintenance_message || 'Desktop client updates are temporarily paused.'}
            </div>
          </div>
        )}

        <section className="border-b border-[var(--border-hairline)]">
          <div className="max-w-[1280px] mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7 space-y-6">
              <div className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
                Desktop Release v{manifest.application.latest_version} · Manifest Schema v{manifest.manifest_version} · {allSdks.length} Managed Runtimes
              </div>

              <h1
                className="font-display font-semibold tracking-tight text-[var(--text-primary)] leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                Multi-stack local runtimes orchestrated from one manifest.
              </h1>

              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                Universal Dev provisions isolated PHP, Node.js, Python, and Flutter toolchains for the PySide6 desktop workspace without polluting your host PATH, backed by verifiable SHA-256 catalogs and project templates.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href={manifest.application.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Desktop Client (v{manifest.application.latest_version})</span>
                </a>
                <button
                  type="button"
                  onClick={() => scrollToSection('releases')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)] text-sm font-medium text-[var(--text-primary)] transition-colors whitespace-nowrap"
                >
                  <span>Browse SDK Catalog</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-4 whitespace-nowrap"
                >
                  {isAuthenticated ? 'Go to Master Admin' : 'Sign in to Master Admin'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-primary)]">
                  <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>GET /api/v1/manifest.json</span>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums">
                  {formatTimestamp(manifest.generated_at)} UTC
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-hairline)]">
                    <div className="text-[var(--text-muted)]">Provider</div>
                    <div className="mt-1 font-medium text-[var(--text-primary)] truncate">{manifest.provider}</div>
                  </div>
                  <div className="p-3 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-hairline)]">
                    <div className="text-[var(--text-muted)]">Min Desktop Client</div>
                    <div className="mt-1 font-mono font-medium text-[var(--text-primary)] tabular-nums">
                      v{manifest.application.minimum_version}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-[var(--border-hairline)] border border-[var(--border-hairline)] rounded-md bg-[var(--bg-canvas)]">
                  {ecosystemSdks.map((sdk) => {
                    const def = sdk.versions.find((v) => v.version === sdk.default_version) ?? sdk.versions[0];
                    return (
                      <div key={sdk.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <span className="font-medium text-[var(--text-primary)]">{sdk.name}</span>
                          <span className="text-[var(--text-muted)]"> · {def?.channel}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                          <span className="text-[var(--text-primary)]">v{sdk.default_version}</span>
                          <span className="text-[var(--text-muted)]">{def ? formatBytes(def.size) : '—'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="ecosystems" className="border-b border-[var(--border-hairline)]">
          <div className="max-w-[1280px] mx-auto px-6 py-14 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Managed Language Ecosystems
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Pre-configured runtimes, verification probes, and bundled package managers ready for desktop workspace provisioning.
                </p>
              </div>
              <div className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
                {templates.templates.length} starter templates · {tools.tools.length} CLI tools registered
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {ecosystemSdks.map((sdk) => {
                const defaultVer = sdk.versions.find((v) => v.version === sdk.default_version) ?? sdk.versions[0];
                const templateCount = templates.templates.filter((t) => t.sdk === sdk.id).length;
                return (
                  <div
                    key={sdk.id}
                    className="p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                          {sdk.name}
                        </h3>
                        <span className="text-xs font-mono text-[var(--accent)] tabular-nums">
                          v{sdk.default_version}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {sdk.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-hairline)] text-xs text-[var(--text-muted)] space-y-1 tabular-nums">
                      <div className="flex justify-between">
                        <span>Executable</span>
                        <span className="font-mono text-[var(--text-primary)]">{defaultVer?.runtime.executable}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Channel / License</span>
                        <span>{defaultVer?.channel} · {sdk.license}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Templates</span>
                        <span>{templateCount} blueprint{templateCount === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="architecture" className="border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]/40">
          <div className="max-w-[1280px] mx-auto px-6 py-14 space-y-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Built for deterministic local environments
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Every binary is verified by SHA-256 before extraction and mounted per-project inside the PySide6 desktop runtime.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {CAPABILITIES.map((cap, idx) => {
                const spanClass = idx === 0 || idx === 3 ? 'md:col-span-7' : 'md:col-span-5';
                return (
                  <div
                    key={cap.num}
                    className={`${spanClass} p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-2.5`}
                  >
                    <div className="text-xs font-mono text-[var(--accent)] tabular-nums">{cap.num}</div>
                    <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                      {cap.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {cap.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="releases" className="border-b border-[var(--border-hairline)]">
          <div className="max-w-[1280px] mx-auto px-6 py-14 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Default Runtime Catalog
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Live release metadata served to desktop clients on bootstrap.
                </p>
              </div>
              <div className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
                CDN {manifest.cdn}
              </div>
            </div>

            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)]/60">
                    <th className="py-3 px-4 font-medium">Runtime</th>
                    <th className="py-3 px-4 font-medium">Default Version</th>
                    <th className="py-3 px-4 font-medium">Platform</th>
                    <th className="py-3 px-4 font-medium">Archive Size</th>
                    <th className="py-3 px-4 font-medium">SHA-256 Prefix</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)] tabular-nums">
                  {defaultRows.map(({ sdk, versionObj }) => (
                    <tr key={sdk.id} className="hover:bg-[var(--bg-elevated)]/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[var(--text-primary)]">{sdk.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{sdk.category}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[var(--text-primary)]">
                        v{sdk.default_version} · {versionObj?.channel}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                        {versionObj ? `${versionObj.platform}/${versionObj.architecture}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--text-secondary)] font-mono">
                        {versionObj ? formatBytes(versionObj.size) : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--text-muted)] font-mono">
                        {versionObj ? `${versionObj.sha256.slice(0, 16)}…` : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="text-emerald-500 font-medium capitalize">
                          {versionObj?.status ?? 'supported'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="endpoints">
          <div className="max-w-[1280px] mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-5">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Client Endpoints & Desktop Sync
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Point the PySide6 desktop app to these static or dynamic endpoints to fetch SDK manifests, project templates, and tool definitions.
                </p>
              </div>

              <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)] text-xs">
                {[
                  { path: 'api/v1/manifest.json', desc: 'SDK versions, SHA-256 digests, download URLs, and minimum client policy' },
                  { path: 'api/v1/templates.json', desc: 'Ecosystem project scaffolds and automated setup commands' },
                  { path: 'api/v1/tools.json', desc: 'Standalone & bundled CLI tool registry (Git, Composer, npm, pip, Flutter)' },
                ].map((ep) => (
                  <div key={ep.path} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-mono font-medium text-[var(--text-primary)]">/{ep.path}</div>
                      <div className="text-[var(--text-muted)]">{ep.desc}</div>
                    </div>
                    <a
                      href={`./${ep.path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap shrink-0"
                    >
                      Open JSON
                    </a>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-mono text-[var(--text-secondary)]">
                  Python Client Manifest Fetch Example
                </div>
                <pre className="p-4 text-xs font-mono text-[var(--text-primary)] overflow-x-auto leading-relaxed">
{`import requests

BASE_URL = "https://<user>.github.io/<repo>"
manifest = requests.get(f"{BASE_URL}/api/v1/manifest.json", timeout=10).json()
print("Latest desktop client:", manifest["application"]["latest_version"])`}
                </pre>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--accent)]">
                <KeyRound className="w-4 h-4" />
                <span>License Status Check</span>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  Verify Desktop License Key
                </h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                  Validate a Universal Dev license key against the active policy ({manifest.license.required ? 'License Enforcement On' : 'Optional / Community Mode'}, {manifest.license.offline_grace_days}-day offline grace).
                </p>
              </div>

              <form onSubmit={handleVerifyLicense} className="space-y-3">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="UDEV-PRO-2026-94F1"
                  aria-label="License key"
                  className="w-full px-3.5 py-2 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="submit"
                  disabled={verifyingLicense}
                  className="w-full py-2 px-4 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-xs font-medium transition-colors"
                >
                  {verifyingLicense ? 'Checking…' : 'Check License Key'}
                </button>
              </form>

              {licenseError && (
                <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10 text-xs text-red-400">
                  {licenseError}
                </div>
              )}

              {licenseResult && (
                <div
                  className={`p-3.5 rounded-md border text-xs space-y-1.5 ${
                    licenseResult.valid
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {licenseResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                    )}
                    <span>
                      {licenseResult.valid
                        ? `Valid · ${licenseResult.plan} (${licenseResult.owner})`
                        : `Status: ${licenseResult.status.toUpperCase()}`}
                    </span>
                  </div>
                  <div className="text-[var(--text-secondary)] font-mono tabular-nums">
                    Key: {licenseResult.key} · Grace: {licenseResult.offline_grace_days}d
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]">
        <div className="max-w-[1280px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div>
            Universal Dev · Multi-Stack Local Workspace & Master Admin Control Plane
          </div>
          <div className="flex items-center gap-5">
            <a href="./api/v1/manifest.json" target="_blank" rel="noreferrer" className="hover:text-[var(--text-primary)]">
              manifest.json
            </a>
            <button type="button" onClick={onOpenAdmin} className="hover:text-[var(--text-primary)] font-medium">
              {isAuthenticated ? 'Master Admin' : 'Admin Login'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
