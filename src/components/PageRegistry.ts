import type { AdminPageId } from '../types';

export interface AdminPageRegistryItem {
  id: AdminPageId;
  title: string;
  section: 'Portal' | 'Catalogs' | 'Governance';
  description: string;
}

export const ADMIN_PAGE_REGISTRY: AdminPageRegistryItem[] = [
  {
    id: 'overview',
    title: 'Client Portal & API',
    section: 'Portal',
    description: 'Desktop client endpoints, release metadata, and handshake testing.',
  },
  {
    id: 'releases',
    title: 'Manifest & Releases',
    section: 'Catalogs',
    description: 'Publish SDK builds, SHA-256 checksums, and channel status in manifest.json.',
  },
  {
    id: 'templates',
    title: 'Templates & Tools',
    section: 'Catalogs',
    description: 'Manage declarative templates.json workflows and tools.json definitions.',
  },
  {
    id: 'licensing',
    title: 'Policy & Licensing',
    section: 'Governance',
    description: 'Control minimum client version, maintenance mode, and license keys.',
  },
  {
    id: 'logs',
    title: 'Audit Logs',
    section: 'Governance',
    description: 'Track admin catalog mutations and desktop client API checks.',
  },
];
