import { Menu, Moon, Plus, Sun } from 'lucide-react';
import type { AdminPageId } from '../types';
import { ADMIN_PAGE_REGISTRY } from './PageRegistry';

interface TopBarProps {
  activePage: AdminPageId;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenPublishRelease: () => void;
  onOpenMobileNav: () => void;
}

export function TopBar({
  activePage,
  theme,
  onToggleTheme,
  onOpenPublishRelease,
  onOpenMobileNav,
}: TopBarProps) {
  const current = ADMIN_PAGE_REGISTRY.find((p) => p.id === activePage);

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-4 px-4 sm:px-6 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)]">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
          className="lg:hidden p-2 -ml-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-[var(--text-muted)] whitespace-nowrap shrink-0 hidden sm:inline">
            Master Admin
          </span>
          <span className="text-[var(--text-muted)] hidden sm:inline" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-semibold text-[var(--text-primary)] truncate">
            {current?.title ?? 'Client Portal & API'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="p-2 rounded-md border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onOpenPublishRelease}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Publish SDK Release</span>
        </button>
      </div>
    </header>
  );
}
