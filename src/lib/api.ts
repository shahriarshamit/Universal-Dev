import type {
  AdminPortalState,
  AuditLogEntry,
  AuditLogLevel,
  AuditLogSource,
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
import {
  createDefaultLicenses,
  createDefaultManifest,
  createDefaultTemplates,
  createDefaultTools,
  evaluateClientBootstrapLocal,
  verifyLicenseLocal,
} from './defaultCatalogs';

const STORAGE_KEY = 'universal_dev_admin_state_v1';

let detectedStaticMode: boolean | null = null;

function loadLocalState(): AdminPortalState {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as AdminPortalState;
      } catch {
        // Re-seed if corrupted
      }
    }
  }
  const seeded: AdminPortalState = {
    manifest: createDefaultManifest(),
    templates: createDefaultTemplates(),
    tools: createDefaultTools(),
    licenses: createDefaultLicenses(),
    logs: [
      {
        id: 'audit_static_1',
        timestamp: new Date().toISOString(),
        level: 'INFO',
        source: 'Manifest',
        message: 'Static GitHub Pages mode active (changes saved in browser storage; export JSON files to update repository).',
      },
    ],
  };
  saveLocalState(seeded);
  return seeded;
}

function saveLocalState(state: AdminPortalState): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function appendLocalLog(
  state: AdminPortalState,
  level: AuditLogLevel,
  source: AuditLogSource,
  message: string,
  detail?: string,
): void {
  const entry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    detail,
  };
  state.logs = [entry, ...state.logs].slice(0, 300);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Non-JSON response (${res.status})`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function isStaticPagesMode(): boolean {
  return detectedStaticMode === true;
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
  async getAdminState(): Promise<AdminPortalState> {
    if (detectedStaticMode !== true) {
      try {
        const remote = await fetchJson<AdminPortalState>('/api/admin/state');
        detectedStaticMode = false;
        return remote;
      } catch {
        detectedStaticMode = true;
      }
    }
    return loadLocalState();
  },

  async testClientBootstrap(payload: {
    client_version: string;
    license_key?: string;
    platform?: string;
  }): Promise<ClientBootstrapResponse> {
    if (!detectedStaticMode) {
      return fetchJson<ClientBootstrapResponse>('/api/v1/client/bootstrap', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    const state = loadLocalState();
    const result = evaluateClientBootstrapLocal(state.manifest, state.licenses, payload);
    appendLocalLog(
      state,
      result.allowed ? 'INFO' : 'WARN',
      'ClientAPI',
      `Static bootstrap simulation (${result.client_version}) -> ${result.allowed ? 'ALLOWED' : 'BLOCKED'}`,
      `license=${result.license_status}`,
    );
    saveLocalState(state);
    return result;
  },

  async verifyLicense(key: string): Promise<LicenseVerifyResponse> {
    if (!detectedStaticMode) {
      return fetchJson<LicenseVerifyResponse>('/api/v1/license/verify', {
        method: 'POST',
        body: JSON.stringify({ key }),
      });
    }
    const state = loadLocalState();
    const res = verifyLicenseLocal(state.manifest, state.licenses, key);
    if (res.valid) {
      const rec = state.licenses.find((l) => l.key === res.key);
      if (rec) rec.last_verified_at = res.verified_at;
    }
    appendLocalLog(
      state,
      res.valid ? 'INFO' : 'WARN',
      'License',
      `Static license verify (${res.key}) -> ${res.status.toUpperCase()}`,
    );
    saveLocalState(state);
    return res;
  },

  async publishManifestVersion(payload: {
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
  }): Promise<ManifestDocument> {
    if (!detectedStaticMode) {
      return fetchJson<ManifestDocument>('/api/admin/manifest/version', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    const state = loadLocalState();
    const sdk = state.manifest.sdks[payload.sdk_id];
    const cleanVersion = payload.version.trim();
    const parsedUrl = new URL(payload.download_url.trim());
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new Error('Download URL must use https:// or http://.');
    }
    const cleanSha = payload.sha256.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(cleanSha)) {
      throw new Error('SHA-256 checksum must be a 64-character hexadecimal string.');
    }

    const base = sdk.versions[0];
    const idx = sdk.versions.findIndex((v) => v.version === cleanVersion);
    const filename = parsedUrl.pathname.split('/').pop() || `${payload.sdk_id}-${cleanVersion}.zip`;
    if (payload.recommended) {
      sdk.versions.forEach((v) => {
        v.recommended = false;
      });
      sdk.default_version = cleanVersion;
    }

    const record: ManifestSdkVersion = {
      ...(idx >= 0 ? sdk.versions[idx] : base),
      version: cleanVersion,
      channel: payload.channel,
      status: payload.status,
      platform: payload.platform || base.platform,
      architecture: payload.architecture || base.architecture,
      recommended: Boolean(payload.recommended),
      download_url: payload.download_url.trim(),
      filename,
      sha256: cleanSha,
      size: Math.max(1024, Number(payload.size) || base.size),
      release_date: new Date().toISOString().slice(0, 10),
      dependencies: payload.dependencies ?? base.dependencies,
      installation: {
        ...base.installation,
        strip_root_folder: payload.strip_root_folder ?? base.installation.strip_root_folder,
        destination: `sdk/${payload.sdk_id}/${cleanVersion}`,
      },
      runtime: {
        ...base.runtime,
        executable: payload.executable || base.runtime.executable,
        verify: {
          args: payload.verify_args?.length ? payload.verify_args : base.runtime.verify.args,
          contains: payload.verify_contains || base.runtime.verify.contains,
        },
      },
    };

    if (idx >= 0) sdk.versions[idx] = record;
    else sdk.versions.unshift(record);
    state.manifest.generated_at = new Date().toISOString();
    appendLocalLog(state, 'INFO', 'Manifest', `Published ${sdk.name} ${record.version}`, record.download_url);
    saveLocalState(state);
    return state.manifest;
  },

  async patchManifestVersionState(payload: {
    sdk_id: SdkId;
    version: string;
    status?: ManifestSdkVersion['status'];
    set_default?: boolean;
  }): Promise<ManifestDocument> {
    if (!detectedStaticMode) {
      return fetchJson<ManifestDocument>('/api/admin/manifest/version', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    }
    const state = loadLocalState();
    const sdk = state.manifest.sdks[payload.sdk_id];
    const target = sdk.versions.find((v) => v.version === payload.version);
    if (!target) throw new Error('Version not found.');
    if (payload.status) target.status = payload.status;
    if (payload.set_default) {
      sdk.versions.forEach((v) => {
        v.recommended = v.version === payload.version;
      });
      sdk.default_version = payload.version;
    }
    state.manifest.generated_at = new Date().toISOString();
    appendLocalLog(state, 'INFO', 'Manifest', `Updated ${sdk.name} ${payload.version}`);
    saveLocalState(state);
    return state.manifest;
  },

  async deleteManifestVersion(sdk_id: SdkId, version: string): Promise<ManifestDocument> {
    if (!detectedStaticMode) {
      return fetchJson<ManifestDocument>('/api/admin/manifest/version', {
        method: 'DELETE',
        body: JSON.stringify({ sdk_id, version }),
      });
    }
    const state = loadLocalState();
    const sdk = state.manifest.sdks[sdk_id];
    if (sdk.versions.length <= 1 || sdk.default_version === version) {
      throw new Error('Cannot remove default or only remaining SDK version.');
    }
    sdk.versions = sdk.versions.filter((v) => v.version !== version);
    state.manifest.generated_at = new Date().toISOString();
    appendLocalLog(state, 'WARN', 'Manifest', `Removed ${sdk.name} ${version}`);
    saveLocalState(state);
    return state.manifest;
  },

  async updateManifestMetadata(patch: {
    provider?: string;
    cdn?: string;
    minimum_client_version?: string;
  }): Promise<ManifestDocument> {
    if (!detectedStaticMode) {
      return fetchJson<ManifestDocument>('/api/admin/manifest/meta', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    }
    const state = loadLocalState();
    if (patch.provider) state.manifest.provider = patch.provider.trim();
    if (patch.cdn) state.manifest.cdn = patch.cdn.trim().replace(/\/+$/, '');
    if (patch.minimum_client_version) state.manifest.minimum_client_version = patch.minimum_client_version.trim();
    state.manifest.generated_at = new Date().toISOString();
    appendLocalLog(state, 'INFO', 'Manifest', 'Updated registry provider & CDN');
    saveLocalState(state);
    return state.manifest;
  },

  async upsertTemplate(payload: {
    id: string;
    sdk: EcosystemId;
    name: string;
    description: string;
    steps: Array<{ tool: string; label: string; arguments: string[] }>;
  }): Promise<TemplateCatalog> {
    if (!detectedStaticMode) {
      return fetchJson<TemplateCatalog>('/api/admin/templates', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    const state = loadLocalState();
    const cleanId = payload.id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const idx = state.templates.templates.findIndex((t) => t.id === cleanId);
    const rec = { ...payload, id: cleanId };
    if (idx >= 0) state.templates.templates[idx] = rec;
    else state.templates.templates.push(rec);
    state.templates.generated_at = new Date().toISOString();
    appendLocalLog(state, 'INFO', 'Manifest', `Published template ${rec.name}`);
    saveLocalState(state);
    return state.templates;
  },

  async deleteTemplate(id: string): Promise<TemplateCatalog> {
    if (!detectedStaticMode) {
      return fetchJson<TemplateCatalog>(`/api/admin/templates/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }
    const state = loadLocalState();
    state.templates.templates = state.templates.templates.filter((t) => t.id !== id);
    state.templates.generated_at = new Date().toISOString();
    appendLocalLog(state, 'WARN', 'Manifest', `Deleted template ${id}`);
    saveLocalState(state);
    return state.templates;
  },

  async updateAdminPolicy(patch: {
    application?: Partial<ManifestApplicationPolicy>;
    license?: Partial<ManifestLicensePolicy>;
  }): Promise<ManifestDocument> {
    if (!detectedStaticMode) {
      return fetchJson<ManifestDocument>('/api/admin/policy', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    }
    const state = loadLocalState();
    if (patch.application) {
      state.manifest.application = { ...state.manifest.application, ...patch.application };
      if (patch.application.minimum_version) {
        state.manifest.minimum_client_version = patch.application.minimum_version;
      }
    }
    if (patch.license) {
      state.manifest.license = { ...state.manifest.license, ...patch.license };
    }
    state.manifest.generated_at = new Date().toISOString();
    appendLocalLog(state, 'INFO', 'Policy', 'Updated application & licensing policy');
    saveLocalState(state);
    return state.manifest;
  },

  async issueLicense(owner: string, plan: LicenseRecord['plan'], offline_grace_days: number): Promise<LicenseRecord[]> {
    if (!detectedStaticMode) {
      return fetchJson<LicenseRecord[]>('/api/admin/licenses', {
        method: 'POST',
        body: JSON.stringify({ owner, plan, offline_grace_days }),
      });
    }
    const state = loadLocalState();
    const token = Math.random().toString(16).slice(2, 6).toUpperCase();
    const rec: LicenseRecord = {
      key: `UDEV-${plan.toUpperCase()}-2026-${token}`,
      owner: owner.trim(),
      plan,
      status: 'active',
      offline_grace_days: Math.max(1, Math.min(90, Number(offline_grace_days) || 14)),
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      last_verified_at: null,
    };
    state.licenses.unshift(rec);
    appendLocalLog(state, 'INFO', 'License', `Issued ${plan} key ${rec.key}`);
    saveLocalState(state);
    return state.licenses;
  },

  async toggleLicense(key: string): Promise<LicenseRecord[]> {
    if (!detectedStaticMode) {
      return fetchJson<LicenseRecord[]>(`/api/admin/licenses/${encodeURIComponent(key)}/toggle`, {
        method: 'POST',
      });
    }
    const state = loadLocalState();
    const rec = state.licenses.find((l) => l.key === key);
    if (!rec) throw new Error('License key not found.');
    rec.status = rec.status === 'active' ? 'revoked' : 'active';
    appendLocalLog(state, 'WARN', 'License', `License ${key} marked ${rec.status.toUpperCase()}`);
    saveLocalState(state);
    return state.licenses;
  },

  async clearLogs(): Promise<{ ok: boolean }> {
    if (!detectedStaticMode) {
      return fetchJson<{ ok: boolean }>('/api/admin/logs', { method: 'DELETE' });
    }
    const state = loadLocalState();
    state.logs = [];
    saveLocalState(state);
    return { ok: true };
  },
};
