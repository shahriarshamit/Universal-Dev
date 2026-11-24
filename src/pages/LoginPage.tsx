import { ArrowLeft, KeyRound, Lock, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, isStaticPagesMode } from '../lib/api';
import type { AuthStatus } from '../types';

interface LoginPageProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onBackToLanding: () => void;
  onAuthenticated: () => Promise<void>;
}

export function LoginPage({
  theme,
  onToggleTheme,
  onBackToLanding,
  onAuthenticated,
}: LoginPageProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [passcode, setPasscode] = useState<string>('');
  const [confirmPasscode, setConfirmPasscode] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAuthStatus()
      .then(setAuthStatus)
      .catch(() => setAuthStatus({ configured: false, source: 'unconfigured' }));
  }, []);

  const isSetup = authStatus ? !authStatus.configured : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSetup) {
      if (passcode.trim().length < 8) {
        setError('Passphrase must be at least 8 characters.');
        return;
      }
      if (passcode !== confirmPasscode) {
        setError('Passphrases do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isSetup) {
        await api.setupAdmin(passcode);
      } else {
        await api.loginAdmin(passcode);
      }
      await onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <header className="h-16 px-6 flex items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Universal Dev</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="p-2 rounded-md border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--accent)]">
              {isSetup ? <KeyRound className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{isSetup ? 'First-Run Admin Setup' : 'Master Admin Authentication'}</span>
            </div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              {isSetup ? 'Claim Admin Passphrase' : 'Sign in to Master Admin'}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {isSetup
                ? isStaticPagesMode()
                  ? 'Create a local passphrase to unlock Master Admin controls in this browser.'
                  : 'Set an admin passphrase for this server (or configure ADMIN_PASSCODE in environment secrets).'
                : authStatus?.source === 'env'
                  ? 'Enter the server ADMIN_PASSCODE to manage manifests, templates, and licenses.'
                  : 'Enter your Master Admin passphrase to open the control plane.'}
            </p>
          </div>

          {!authStatus ? (
            <div className="py-6 text-xs text-[var(--text-muted)]">Checking authentication status…</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="admin-passcode" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  {isSetup ? 'Create Passphrase (min. 8 characters)' : 'Admin Passphrase'}
                </label>
                <input
                  id="admin-passcode"
                  type="password"
                  required
                  autoFocus
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {isSetup && (
                <div>
                  <label htmlFor="admin-passcode-confirm" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Confirm Passphrase
                  </label>
                  <input
                    id="admin-passcode-confirm"
                    type="password"
                    required
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}

              {error && (
                <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10 text-xs text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {submitting
                  ? 'Verifying…'
                  : isSetup
                    ? 'Save Passphrase & Continue'
                    : 'Sign In'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
