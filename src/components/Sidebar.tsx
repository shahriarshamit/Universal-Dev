import {
  ArrowUpRight,
  Boxes,
  FileCode2,
  Globe,
  KeyRound,
  LogOut,
  ScrollText,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { AdminPageId } from '../types';
import { ADMIN_PAGE_REGISTRY } from './PageRegistry';

const PAGE_ICONS: Record<AdminPageId, ComponentType<{ className?: string }>> = {
  overview: Globe,
  releases: Boxes,
  templates: FileCode2,
  licensing: KeyRound,
  logs: ScrollText,
};

interface SidebarProps {
  activePage: AdminPageId;
  onNavigate: (page: AdminPageId) => void;
  manifestVersion: number;
  latestClientVersion: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenLanding: () => void;
  onSignOut: () => void;
}

export function Sidebar({
  activePage,
  onNavigate,
  manifestVersion,
  latestClientVersion,
  mobileOpen,
  onCloseMobile,
  onOpenLanding,
  onSignOut,
}: SidebarProps) {
  const sections: Array<'Portal' | 'Catalogs' | 'Governance'> = ['Portal', 'Catalogs', 'Governance'];

  const handleSelect = (id: AdminPageId) => {
    onNavigate(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col bg-[var(--bg-surface)] border-r border-[var(--border-hairline)]">
      <div className="flex items-center justify-between h-14 px-5 border-b border-[var(--border-hairline)] shrink-0">
        <button
          type="button"
          onClick={() => {
            onOpenLanding();
            onCloseMobile();
          }}
          className="font-display text-base font-semibold tracking-tight text-[var(--text-primary)] whitespace-nowrap hover:text-[var(--accent)] transition-colors"
        >
          Universal Dev
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="lg:hidden p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Primary navigation">
        {sections.map((section) => {
          const items = ADMIN_PAGE_REGISTRY.filter((p) => p.section === section);
          return (
            <div key={section}>
              <div className="px-3 mb-2 text-xs font-medium text-[var(--text-muted)]">
                {section}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = PAGE_ICONS[item.id];
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                        isActive
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-[var(--border-hairline)] text-xs text-[var(--text-muted)] space-y-2.5">
        <div>
          <div className="truncate font-medium text-[var(--text-secondary)]">Master Admin Control Plane</div>
          <div className="mt-0.5 truncate tabular-nums">
            Manifest v{manifestVersion} · Client v{latestClientVersion}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-hairline)]">
          <button
            type="button"
            onClick={() => {
              onOpenLanding();
              onCloseMobile();
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <span>Public Site</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              onSignOut();
              onCloseMobile();
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-red-400"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[252px] shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50" onClick={onCloseMobile} aria-hidden="true" />
          <aside className="relative z-10 w-[264px] max-w-[82vw] h-full">{navContent}</aside>
        </div>
      )}
    </>
  );
}
