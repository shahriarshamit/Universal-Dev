import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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
  ProjectTemplate,
  SdkId,
  TemplateCatalog,
  ToolCatalog,
} from '../src/types.ts';
import {
  createDefaultLicenses,
  createDefaultManifest,
  createDefaultTemplates,
  createDefaultTools,
} from './catalogs.ts';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const CATALOGS_DIR = path.join(DATA_DIR, 'catalogs');
const REGISTRY_DIR = path.join(DATA_DIR, 'registry');
const LOGS_DIR = path.join(DATA_DIR, 'logs');

const PATHS = {
  manifest: path.join(CATALOGS_DIR, 'manifest.json'),
  templates: path.join(CATALOGS_DIR, 'templates.json'),
  tools: path.join(CATALOGS_DIR, 'tools.json'),
  licenses: path.join(REGISTRY_DIR, 'licenses.json'),
  logs: path.join(LOGS_DIR, 'admin_audit.json'),
};

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJsonOrSeed<T>(filePath: string, seedFactory: () => T): T {
  if (!fs.existsSync(filePath)) {
    const seeded = seedFactory();
    fs.writeFileSync(filePath, JSON.stringify(seeded, null, 2), 'utf8');
    return seeded;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export class MasterAdminStore {
  private manifest!: ManifestDocument;
  private templates!: TemplateCatalog;
  private tools!: ToolCatalog;
  private licenses!: LicenseRecord[];
  private logs!: AuditLogEntry[];

  constructor() {
    [DATA_DIR, CATALOGS_DIR, REGISTRY_DIR, LOGS_DIR].forEach(ensureDir);
    this.manifest = readJsonOrSeed(PATHS.manifest, createDefaultManifest);
    this.templates = readJsonOrSeed(PATHS.templates, createDefaultTemplates);
    this.tools = readJsonOrSeed(PATHS.tools, createDefaultTools);
    this.licenses = readJsonOrSeed(PATHS.licenses, createDefaultLicenses);
    this.logs = readJsonOrSeed(PATHS.logs, () => [
      {
        id: 'audit_boot_1',
        timestamp: new Date().toISOString(),
        level: 'INFO',
        source: 'Manifest',
        message: 'Master Admin Registry initialized (manifest_version 2 · api_version 1).',
      },
    ]);
  }

  private addLog(level: AuditLogLevel, source: AuditLogSource, message: string, detail?: string): void {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      detail,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 300) {
      this.logs = this.logs.slice(0, 300);
    }
    writeJson(PATHS.logs, this.logs);
  }

  public getAdminState(): AdminPortalState {
    return {
      manifest: this.manifest,
      templates: this.templates,
      tools: this.tools,
      licenses: this.licenses,
      logs: this.logs,
    };
  }

  public getManifest(): ManifestDocument {
    return this.manifest;
  }

  public getTemplates(): TemplateCatalog {
    return this.templates;
  }

  public getTools(): ToolCatalog {
    return this.tools;
  }

  public clearLogs(): void {
    this.logs = [];
    writeJson(PATHS.logs, this.logs);
  }

  // --- PySide6 Desktop Client APIs (/api/v1/*) ---

  public evaluateClientBootstrap(input: {
    client_version?: string;
    license_key?: string;
    platform?: string;
  }): ClientBootstrapResponse {
    const clientVer = (input.client_version || '0.6.5').trim();
    const minVer = this.manifest.application.minimum_version;
    const latestVer = this.manifest.application.latest_version;
    const belowMin = compareSemver(clientVer, minVer) < 0;
    const updateAvailable = compareSemver(clientVer, latestVer) < 0;
    const updateRequired = Boolean(this.manifest.application.update_required || belowMin);
    const maintenance = Boolean(this.manifest.application.maintenance);

    let licenseStatus: ClientBootstrapResponse['license_status'] = 'not_required';
    let licenseValid = !this.manifest.license.required;

    const key = (input.license_key || '').trim();
    if (this.manifest.license.required || key) {
      if (!key) {
        licenseStatus = 'missing';
        licenseValid = false;
      } else {
        const rec = this.licenses.find((l) => l.key === key);
        if (!rec) {
          licenseStatus = 'invalid';
          licenseValid = false;
        } else if (rec.status === 'revoked') {
          licenseStatus = 'revoked';
          licenseValid = false;
        } else if (new Date(rec.expires_at).getTime() < Date.now() || rec.status === 'expired') {
          licenseStatus = 'expired';
          licenseValid = false;
        } else {
          licenseStatus = 'valid';
          licenseValid = true;
          rec.last_verified_at = new Date().toISOString();
          writeJson(PATHS.licenses, this.licenses);
        }
      }
    }

    const allowed = !maintenance && !updateRequired && (licenseValid || !this.manifest.license.required);

    this.addLog(
      allowed ? 'INFO' : 'WARN',
      'ClientAPI',
      `PySide6 client bootstrap (${clientVer} · ${input.platform || 'windows'}) -> ${allowed ? 'ALLOWED' : 'BLOCKED'}`,
      `license=${licenseStatus}, update_required=${updateRequired}, maintenance=${maintenance}`,
    );

    return {
      allowed,
      client_version: clientVer,
      minimum_version: minVer,
      latest_version: latestVer,
      desktop_download_url: this.manifest.application.download_url,
      update_available: updateAvailable,
      update_required: updateRequired,
      maintenance,
      maintenance_message: this.manifest.application.maintenance_message,
      license_required: this.manifest.license.required,
      license_valid: licenseValid,
      license_status: licenseStatus,
      offline_grace_days: this.manifest.license.offline_grace_days,
      endpoints: {
        manifest: '/api/v1/manifest.json',
        templates: '/api/v1/templates.json',
        tools: '/api/v1/tools.json',
        license_verify: '/api/v1/license/verify',
      },
    };
  }

  public verifyLicense(rawKey: string): LicenseVerifyResponse {
    const key = (rawKey || '').trim().toUpperCase();
    const now = new Date().toISOString();
    const rec = this.licenses.find((l) => l.key === key);

    if (!rec) {
      this.addLog('WARN', 'License', `License check failed (not found): ${key || '<empty>'}`);
      return {
        valid: false,
        key,
        status: 'not_found',
        plan: null,
        owner: null,
        offline_grace_days: this.manifest.license.offline_grace_days,
        expires_at: null,
        verified_at: now,
      };
    }

    const expired = new Date(rec.expires_at).getTime() < Date.now() || rec.status === 'expired';
    const valid = rec.status === 'active' && !expired;
    if (valid) {
      rec.last_verified_at = now;
      writeJson(PATHS.licenses, this.licenses);
    }

    this.addLog(
      valid ? 'INFO' : 'WARN',
      'License',
      `Verified license ${rec.key} (${rec.plan}) -> ${valid ? 'ACTIVE' : rec.status.toUpperCase()}`,
    );

    return {
      valid,
      key: rec.key,
      status: expired ? 'expired' : rec.status,
      plan: rec.plan,
      owner: rec.owner,
      offline_grace_days: rec.offline_grace_days,
      expires_at: rec.expires_at,
      verified_at: now,
    };
  }

  // --- Manifest & Release Management ---

  public upsertManifestVersion(input: {
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
  }): ManifestDocument {
    const sdk = this.manifest.sdks[input.sdk_id];
    if (!sdk) throw new Error(`Unknown SDK "${input.sdk_id}".`);

    const cleanVersion = input.version.trim();
    if (!/^[a-zA-Z0-9._-]+$/.test(cleanVersion)) {
      throw new Error('Version must contain only digits, letters, dots, underscores, or hyphens.');
    }

    const parsedUrl = new URL(input.download_url.trim());
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new Error('Download URL must use https:// or http://.');
    }

    const cleanSha = input.sha256.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(cleanSha)) {
      throw new Error('SHA-256 checksum must be a 64-character hexadecimal string.');
    }

    const fallbackTemplate = sdk.versions[0];
    const existingIdx = sdk.versions.findIndex((v) => v.version === cleanVersion);
    const filename = path.posix.basename(parsedUrl.pathname) || `${input.sdk_id}-${cleanVersion}.zip`;

    if (input.recommended) {
      sdk.versions.forEach((v) => {
        v.recommended = false;
      });
      sdk.default_version = cleanVersion;
    }

    const base = existingIdx >= 0 ? sdk.versions[existingIdx] : fallbackTemplate;
    const record: ManifestSdkVersion = {
      ...base,
      version: cleanVersion,
      channel: input.channel,
      status: input.status,
      platform: input.platform?.trim() || base.platform,
      architecture: input.architecture?.trim() || base.architecture,
      recommended: Boolean(input.recommended),
      download_url: input.download_url.trim(),
      filename,
      sha256: cleanSha,
      size: Math.max(1024, Number(input.size) || base.size),
      release_date: new Date().toISOString().slice(0, 10),
      dependencies: Array.isArray(input.dependencies) ? input.dependencies : base.dependencies,
      installation: {
        ...base.installation,
        strip_root_folder:
          input.strip_root_folder !== undefined
            ? Boolean(input.strip_root_folder)
            : base.installation.strip_root_folder,
        destination: `sdk/${input.sdk_id}/${cleanVersion}`,
      },
      runtime: {
        ...base.runtime,
        executable: input.executable?.trim() || base.runtime.executable,
        verify: {
          args:
            input.verify_args && input.verify_args.length > 0
              ? input.verify_args
              : base.runtime.verify.args,
          contains: input.verify_contains?.trim() || base.runtime.verify.contains,
        },
      },
    };

    if (existingIdx >= 0) {
      sdk.versions[existingIdx] = record;
    } else {
      sdk.versions.unshift(record);
    }

    this.manifest.generated_at = new Date().toISOString();
    writeJson(PATHS.manifest, this.manifest);
    this.addLog(
      'INFO',
      'Manifest',
      `${existingIdx >= 0 ? 'Updated' : 'Published'} ${sdk.name} ${record.version} (${record.status} · ${record.channel})`,
      record.download_url,
    );
    return this.manifest;
  }

  public patchManifestVersionState(input: {
    sdk_id: SdkId;
    version: string;
    status?: ManifestSdkVersion['status'];
    set_default?: boolean;
  }): ManifestDocument {
    const sdk = this.manifest.sdks[input.sdk_id];
    if (!sdk) throw new Error(`Unknown SDK "${input.sdk_id}".`);
    const target = sdk.versions.find((v) => v.version === input.version);
    if (!target) throw new Error(`Version ${input.version} not found.`);

    if (input.status) {
      target.status = input.status;
    }
    if (input.set_default) {
      sdk.versions.forEach((v) => {
        v.recommended = v.version === input.version;
      });
      sdk.default_version = input.version;
    }

    this.manifest.generated_at = new Date().toISOString();
    writeJson(PATHS.manifest, this.manifest);
    this.addLog(
      'INFO',
      'Manifest',
      `Modified ${sdk.name} ${input.version}${input.status ? ` status=${input.status}` : ''}${input.set_default ? ' (set default)' : ''}`,
    );
    return this.manifest;
  }

  public deleteManifestVersion(sdkId: SdkId, version: string): ManifestDocument {
    const sdk = this.manifest.sdks[sdkId];
    if (!sdk) throw new Error(`Unknown SDK "${sdkId}".`);
    if (sdk.versions.length <= 1) {
      throw new Error('At least one version must remain in the catalog for each SDK.');
    }
    if (sdk.default_version === version) {
      throw new Error('Switch the default version before deleting this release.');
    }
    sdk.versions = sdk.versions.filter((v) => v.version !== version);
    this.manifest.generated_at = new Date().toISOString();
    writeJson(PATHS.manifest, this.manifest);
    this.addLog('WARN', 'Manifest', `Removed ${sdk.name} ${version} from manifest.json`);
    return this.manifest;
  }

  public updateManifestMetadata(patch: {
    provider?: string;
    cdn?: string;
    minimum_client_version?: string;
  }): ManifestDocument {
    if (patch.provider !== undefined && patch.provider.trim()) {
      this.manifest.provider = patch.provider.trim();
    }
    if (patch.cdn !== undefined && patch.cdn.trim()) {
      const parsed = new URL(patch.cdn.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('CDN URL must use http:// or https://.');
      }
      this.manifest.cdn = patch.cdn.trim().replace(/\/+$/, '');
    }
    if (patch.minimum_client_version !== undefined && patch.minimum_client_version.trim()) {
      this.manifest.minimum_client_version = patch.minimum_client_version.trim();
    }
    this.manifest.generated_at = new Date().toISOString();
    writeJson(PATHS.manifest, this.manifest);
    this.addLog('INFO', 'Manifest', 'Updated manifest provider & CDN settings');
    return this.manifest;
  }

  // --- Templates Management ---

  public upsertTemplate(input: {
    id: string;
    sdk: EcosystemId;
    name: string;
    description: string;
    steps: Array<{ tool: string; label: string; arguments: string[] }>;
  }): TemplateCatalog {
    const cleanId = input.id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (cleanId.length < 2) throw new Error('Template ID must be at least 2 characters.');
    if (!input.name.trim()) throw new Error('Template name is required.');
    if (!input.steps.length) throw new Error('At least one scaffold step is required.');

    const record: ProjectTemplate = {
      id: cleanId,
      sdk: input.sdk,
      name: input.name.trim(),
      description: input.description.trim(),
      steps: input.steps,
    };

    const idx = this.templates.templates.findIndex((t) => t.id === cleanId);
    if (idx >= 0) {
      this.templates.templates[idx] = record;
    } else {
      this.templates.templates.push(record);
    }

    this.templates.generated_at = new Date().toISOString();
    writeJson(PATHS.templates, this.templates);
    this.addLog('INFO', 'Manifest', `${idx >= 0 ? 'Updated' : 'Published'} template "${record.name}" (${record.sdk}) in templates.json`);
    return this.templates;
  }

  public deleteTemplate(id: string): TemplateCatalog {
    this.templates.templates = this.templates.templates.filter((t) => t.id !== id);
    this.templates.generated_at = new Date().toISOString();
    writeJson(PATHS.templates, this.templates);
    this.addLog('WARN', 'Manifest', `Removed template "${id}" from templates.json`);
    return this.templates;
  }

  // --- Policy & Licenses ---

  public updateAdminPolicy(patch: {
    application?: Partial<ManifestApplicationPolicy>;
    license?: Partial<ManifestLicensePolicy>;
  }): ManifestDocument {
    if (patch.application) {
      if (patch.application.download_url) {
        const parsed = new URL(patch.application.download_url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          throw new Error('Desktop installer download URL must use http:// or https://.');
        }
      }
      this.manifest.application = { ...this.manifest.application, ...patch.application };
      if (patch.application.minimum_version) {
        this.manifest.minimum_client_version = patch.application.minimum_version;
      }
    }
    if (patch.license) {
      this.manifest.license = { ...this.manifest.license, ...patch.license };
    }
    this.manifest.generated_at = new Date().toISOString();
    writeJson(PATHS.manifest, this.manifest);
    this.addLog(
      'INFO',
      'Policy',
      `Updated policy (min=${this.manifest.application.minimum_version}, latest=${this.manifest.application.latest_version}, maintenance=${this.manifest.application.maintenance}, license_required=${this.manifest.license.required})`,
    );
    return this.manifest;
  }

  public issueLicense(owner: string, plan: LicenseRecord['plan'], offlineGraceDays: number): LicenseRecord[] {
    const cleanOwner = owner.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanOwner)) {
      throw new Error('Enter a valid email address for the license owner.');
    }
    const token = crypto.randomBytes(2).toString('hex').toUpperCase();
    const record: LicenseRecord = {
      key: `UDEV-${plan.toUpperCase()}-2026-${token}`,
      owner: cleanOwner,
      plan,
      status: 'active',
      offline_grace_days: Math.max(1, Math.min(90, Number(offlineGraceDays) || 14)),
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      last_verified_at: null,
    };
    this.licenses.unshift(record);
    writeJson(PATHS.licenses, this.licenses);
    this.addLog('INFO', 'License', `Issued ${plan} key ${record.key} for ${cleanOwner}`);
    return this.licenses;
  }

  public toggleLicenseStatus(key: string): LicenseRecord[] {
    const rec = this.licenses.find((l) => l.key === key);
    if (!rec) throw new Error('License key not found.');
    rec.status = rec.status === 'active' ? 'revoked' : 'active';
    writeJson(PATHS.licenses, this.licenses);
    this.addLog('WARN', 'License', `License ${rec.key} marked ${rec.status.toUpperCase()}`);
    return this.licenses;
  }
}
