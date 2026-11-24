/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { PublishReleaseModal } from './components/PublishReleaseModal';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { api } from './lib/api';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { LicensingPolicyPage } from './pages/LicensingPolicyPage';
import { OverviewPortalPage } from './pages/OverviewPortalPage';
import { ReleasesCatalogPage } from './pages/ReleasesCatalogPage';
import { TemplatesToolsPage } from './pages/TemplatesToolsPage';
import type { AdminPageId, AdminPortalState } from './types';

export default function App() {
  const [state, setState] = useState<AdminPortalState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<AdminPageId>('overview');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [publishOpen, setPublishOpen] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  const refreshState = useCallback(async () => {
    try {
      const next = await api.getAdminState();
      setState(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach Master Admin backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  if (loading && !state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-secondary)] text-sm">
        Loading Master Admin Control Plane…
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[var(--bg-canvas)] p-6 text-center">
        <div className="text-sm font-semibold text-[var(--text-primary)]">
          Unable to load Master Admin server
        </div>
        <div className="text-xs text-[var(--text-muted)]">{error}</div>
        <button
          type="button"
          onClick={refreshState}
          className="px-4 py-2 rounded-md bg-[var(--accent)] text-white text-xs font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        manifestVersion={state.manifest.manifest_version}
        latestClientVersion={state.manifest.application.latest_version}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activePage={activePage}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onOpenPublishRelease={() => setPublishOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        {state.manifest.application.maintenance && (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/30 text-xs text-amber-400">
            Maintenance Mode Active: {state.manifest.application.maintenance_message || 'PySide6 client downloads and bootstraps are currently paused.'}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activePage === 'overview' && (
            <OverviewPortalPage
              manifest={state.manifest}
              templates={state.templates}
              licenses={state.licenses}
              onNavigate={setActivePage}
              onRefreshState={refreshState}
            />
          )}

          {activePage === 'releases' && (
            <ReleasesCatalogPage
              manifest={state.manifest}
              onRefreshState={refreshState}
              onOpenPublishModal={() => setPublishOpen(true)}
            />
          )}

          {activePage === 'templates' && (
            <TemplatesToolsPage
              templates={state.templates}
              tools={state.tools}
              onRefreshState={refreshState}
            />
          )}

          {activePage === 'licensing' && (
            <LicensingPolicyPage
              manifest={state.manifest}
              licenses={state.licenses}
              onRefreshState={refreshState}
            />
          )}

          {activePage === 'logs' && (
            <AuditLogsPage
              logs={state.logs}
              onClearLogs={async () => {
                await api.clearLogs();
                await refreshState();
              }}
            />
          )}
        </main>
      </div>

      <PublishReleaseModal
        open={publishOpen}
        manifest={state.manifest}
        onClose={() => setPublishOpen(false)}
        onPublished={refreshState}
      />
    </div>
  );
}
