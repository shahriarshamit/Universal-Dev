/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { PublishReleaseModal } from './components/PublishReleaseModal';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { api, clearSessionToken, hasActiveSession } from './lib/api';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { LandingPage } from './pages/LandingPage';
import { LicensingPolicyPage } from './pages/LicensingPolicyPage';
import { LoginPage } from './pages/LoginPage';
import { OverviewPortalPage } from './pages/OverviewPortalPage';
import { ReleasesCatalogPage } from './pages/ReleasesCatalogPage';
import { TemplatesToolsPage } from './pages/TemplatesToolsPage';
import type { AdminPageId, AdminPortalState, AppRouteView, PublicPortalSummary } from './types';

function resolveInitialRoute(): AppRouteView {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash === '#/login' || hash === '#/admin') {
      return 'login';
    }
  }
  return 'landing';
}

export default function App() {
  const [view, setView] = useState<AppRouteView>(resolveInitialRoute);
  const [summary, setSummary] = useState<PublicPortalSummary | null>(null);
  const [state, setState] = useState<AdminPortalState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<AdminPageId>('overview');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [publishOpen, setPublishOpen] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  const loadSummary = useCallback(async () => {
    try {
      const next = await api.getPublicSummary();
      setSummary(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Universal Dev portal.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAdminState = useCallback(async () => {
    try {
      const next = await api.getAdminState();
      setState(next);
      setSummary({
        manifest: next.manifest,
        templates: next.templates,
        tools: next.tools,
      });
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reach Master Admin backend.';
      if (message.toLowerCase().includes('authentication')) {
        clearSessionToken();
        setState(null);
        setView('login');
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/admin') {
        setView(hasActiveSession() ? 'admin' : 'login');
      } else if (hash === '#/login') {
        setView('login');
      } else {
        setView('landing');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const navigateTo = useCallback((nextView: AppRouteView) => {
    setView(nextView);
    if (typeof window !== 'undefined') {
      if (nextView === 'landing') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } else {
        window.location.hash = `#/${nextView}`;
      }
    }
  }, []);

  const handleOpenAdmin = useCallback(async () => {
    if (hasActiveSession()) {
      setLoading(true);
      await refreshAdminState();
      if (hasActiveSession()) {
        navigateTo('admin');
      }
      return;
    }
    navigateTo('login');
  }, [navigateTo, refreshAdminState]);

  const handleAuthenticated = useCallback(async () => {
    setLoading(true);
    await refreshAdminState();
    navigateTo('admin');
  }, [navigateTo, refreshAdminState]);

  const handleSignOut = useCallback(() => {
    clearSessionToken();
    setState(null);
    setPublishOpen(false);
    navigateTo('landing');
    loadSummary();
  }, [loadSummary, navigateTo]);

  if (loading && !summary && view === 'landing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-secondary)] text-sm">
        Loading Universal Dev…
      </div>
    );
  }

  if (view === 'login') {
    return (
      <LoginPage
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onBackToLanding={() => navigateTo('landing')}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  if (view === 'landing') {
    if (error || !summary) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[var(--bg-canvas)] p-6 text-center">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            Unable to load Universal Dev portal
          </div>
          <div className="text-xs text-[var(--text-muted)]">{error}</div>
          <button
            type="button"
            onClick={loadSummary}
            className="px-4 py-2 rounded-md bg-[var(--accent)] text-white text-xs font-medium"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <LandingPage
        summary={summary}
        theme={theme}
        isAuthenticated={hasActiveSession()}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenAdmin={handleOpenAdmin}
      />
    );
  }

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshAdminState}
            className="px-4 py-2 rounded-md bg-[var(--accent)] text-white text-xs font-medium"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => navigateTo('landing')}
            className="px-4 py-2 rounded-md border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
          >
            Back to Website
          </button>
        </div>
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
        onOpenLanding={() => navigateTo('landing')}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activePage={activePage}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onOpenPublishRelease={() => setPublishOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenLanding={() => navigateTo('landing')}
          onSignOut={handleSignOut}
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
              onRefreshState={refreshAdminState}
            />
          )}

          {activePage === 'releases' && (
            <ReleasesCatalogPage
              manifest={state.manifest}
              onRefreshState={refreshAdminState}
              onOpenPublishModal={() => setPublishOpen(true)}
            />
          )}

          {activePage === 'templates' && (
            <TemplatesToolsPage
              templates={state.templates}
              tools={state.tools}
              onRefreshState={refreshAdminState}
            />
          )}

          {activePage === 'licensing' && (
            <LicensingPolicyPage
              manifest={state.manifest}
              licenses={state.licenses}
              onRefreshState={refreshAdminState}
            />
          )}

          {activePage === 'logs' && (
            <AuditLogsPage
              logs={state.logs}
              onClearLogs={async () => {
                await api.clearLogs();
                await refreshAdminState();
              }}
            />
          )}
        </main>
      </div>

      <PublishReleaseModal
        open={publishOpen}
        manifest={state.manifest}
        onClose={() => setPublishOpen(false)}
        onPublished={refreshAdminState}
      />
    </div>
  );
}
