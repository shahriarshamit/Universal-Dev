import type {
  AdminPortalState,
  ClientBootstrapResponse,
  EcosystemId,
  LicenseRecord,
  LicenseVerifyResponse,
  ManifestApplicationPolicy,
  ManifestDocument,
  ManifestLicensePolicy,
  ManifestSdkVersion,
  SdkId,
  TemplateCatalog,
} from '../types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

export const api = {
  getAdminState: () => request<AdminPortalState>('/api/admin/state'),

  // PySide6 Desktop Client API testers
  testClientBootstrap: (payload: {
    client_version: string;
    license_key?: string;
    platform?: string;
  }) =>
    request<ClientBootstrapResponse>('/api/v1/client/bootstrap', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyLicense: (key: string) =>
    request<LicenseVerifyResponse>('/api/v1/license/verify', {
      method: 'POST',
      body: JSON.stringify({ key }),
    }),

  // Manifest & Releases
  publishManifestVersion: (payload: {
    sdk_id: SdkId;
    version: string;
    channel: ManifestSdkVersion['channel'];
    status: ManifestSdkVersion['status'];
    platform?: string;
    architecture?: string;
    download_url: string;
    sha256: string;
    size: number;
    dependencies?: string[];
    executable?: string;
    verify_args?: string[];
    verify_contains?: string;
    strip_root_folder?: boolean;
    recommended?: boolean;
  }) =>
    request<ManifestDocument>('/api/admin/manifest/version', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  patchManifestVersionState: (payload: {
    sdk_id: SdkId;
    version: string;
    status?: ManifestSdkVersion['status'];
    set_default?: boolean;
  }) =>
    request<ManifestDocument>('/api/admin/manifest/version', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteManifestVersion: (sdk_id: SdkId, version: string) =>
    request<ManifestDocument>('/api/admin/manifest/version', {
      method: 'DELETE',
      body: JSON.stringify({ sdk_id, version }),
    }),

  updateManifestMetadata: (patch: {
    provider?: string;
    cdn?: string;
    minimum_client_version?: string;
  }) =>
    request<ManifestDocument>('/api/admin/manifest/meta', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  // Templates
  upsertTemplate: (payload: {
    id: string;
    sdk: EcosystemId;
    name: string;
    description: string;
    steps: Array<{ tool: string; label: string; arguments: string[] }>;
  }) =>
    request<TemplateCatalog>('/api/admin/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteTemplate: (id: string) =>
    request<TemplateCatalog>(`/api/admin/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // Policy & Licensing
  updateAdminPolicy: (patch: {
    application?: Partial<ManifestApplicationPolicy>;
    license?: Partial<ManifestLicensePolicy>;
  }) =>
    request<ManifestDocument>('/api/admin/policy', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  issueLicense: (owner: string, plan: LicenseRecord['plan'], offline_grace_days: number) =>
    request<LicenseRecord[]>('/api/admin/licenses', {
      method: 'POST',
      body: JSON.stringify({ owner, plan, offline_grace_days }),
    }),

  toggleLicense: (key: string) =>
    request<LicenseRecord[]>(`/api/admin/licenses/${encodeURIComponent(key)}/toggle`, {
      method: 'POST',
    }),

  clearLogs: () => request<{ ok: boolean }>('/api/admin/logs', { method: 'DELETE' }),
};
