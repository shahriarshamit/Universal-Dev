export type SdkId = 'php' | 'node' | 'python' | 'flutter' | 'git' | 'composer';
export type EcosystemId = 'php' | 'node' | 'python' | 'flutter';
export type AdminPageId = 'overview' | 'releases' | 'templates' | 'licensing' | 'logs';
export type AppRouteView = 'landing' | 'login' | 'admin';

export type VersionStatus = 'supported' | 'deprecated' | 'beta' | 'preview' | 'nightly' | 'unsupported';
export type VersionChannel = 'stable' | 'lts' | 'beta' | 'nightly';

export interface SdkRuntimeCommand {
  id: string;
  title: string;
  args: string[];
}

export interface SdkRuntimeConfig {
  executable: string;
  working_directory: string;
  path_entries: string[];
  environment: Record<string, string>;
  verify: {
    args: string[];
    contains: string;
  };
  commands: SdkRuntimeCommand[];
}

export interface SdkInstallationConfig {
  installer_type: string;
  archive_type: string;
  extract: boolean;
  strip_root_folder: boolean;
  silent_arguments: string[];
  destination: string;
}

export interface ManifestSdkVersion {
  version: string;
  minimum_client: string;
  status: VersionStatus;
  channel: VersionChannel;
  recommended: boolean;
  platform: string;
  architecture: string;
  thread_safe?: boolean;
  compiler?: string;
  filename: string;
  download_url: string;
  sha256: string;
  size: number;
  release_date: string;
  dependencies: string[];
  installation: SdkInstallationConfig;
  runtime: SdkRuntimeConfig;
}

export interface ManifestSdk {
  id: SdkId;
  name: string;
  category: 'ecosystem' | 'tool';
  description: string;
  homepage: string;
  license: string;
  tags: string[];
  default_version: string;
  versions: ManifestSdkVersion[];
}

export interface ManifestApplicationPolicy {
  minimum_version: string;
  latest_version: string;
  download_url: string;
  update_required: boolean;
  maintenance: boolean;
  maintenance_message: string;
}

export interface ManifestLicensePolicy {
  required: boolean;
  offline_grace_days: number;
}

export interface ManifestDocument {
  manifest_version: number;
  api_version: number;
  generated_at: string;
  minimum_client_version: string;
  provider: string;
  cdn: string;
  application: ManifestApplicationPolicy;
  license: ManifestLicensePolicy;
  sdks: Record<SdkId, ManifestSdk>;
}

export interface TemplateStep {
  tool: string;
  label: string;
  arguments: string[];
}

export interface ProjectTemplate {
  id: string;
  sdk: EcosystemId;
  name: string;
  description: string;
  steps: TemplateStep[];
}

export interface TemplateCatalog {
  version: number;
  generated_at: string;
  templates: ProjectTemplate[];
}

export interface ToolDefinition {
  id: string;
  name: string;
  kind: 'standalone' | 'bundled';
  sdk_id: SdkId;
  executable: string;
  description: string;
}

export interface ToolCatalog {
  version: number;
  tools: ToolDefinition[];
}

export interface LicenseRecord {
  key: string;
  owner: string;
  plan: 'Community' | 'Pro' | 'Team';
  status: 'active' | 'revoked' | 'expired';
  offline_grace_days: number;
  issued_at: string;
  expires_at: string;
  last_verified_at: string | null;
}

export type AuditLogLevel = 'INFO' | 'WARN' | 'ERROR';
export type AuditLogSource = 'Manifest' | 'Policy' | 'License' | 'ClientAPI';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  level: AuditLogLevel;
  source: AuditLogSource;
  message: string;
  detail?: string;
}

export interface ClientBootstrapResponse {
  allowed: boolean;
  client_version: string;
  minimum_version: string;
  latest_version: string;
  desktop_download_url: string;
  update_available: boolean;
  update_required: boolean;
  maintenance: boolean;
  maintenance_message: string;
  license_required: boolean;
  license_valid: boolean;
  license_status: 'valid' | 'not_required' | 'missing' | 'revoked' | 'expired' | 'invalid';
  offline_grace_days: number;
  endpoints: {
    manifest: string;
    templates: string;
    tools: string;
    license_verify: string;
  };
}

export interface LicenseVerifyResponse {
  valid: boolean;
  key: string;
  status: 'active' | 'revoked' | 'expired' | 'not_found';
  plan: LicenseRecord['plan'] | null;
  owner: string | null;
  offline_grace_days: number;
  expires_at: string | null;
  verified_at: string;
}

export interface AuthStatus {
  configured: boolean;
  source: 'env' | 'claimed' | 'unconfigured';
}

export interface AuthSession {
  token: string;
  expires_at: string;
}

export interface PublicPortalSummary {
  manifest: ManifestDocument;
  templates: TemplateCatalog;
  tools: ToolCatalog;
}

export interface AdminPortalState {
  manifest: ManifestDocument;
  templates: TemplateCatalog;
  tools: ToolCatalog;
  licenses: LicenseRecord[];
  logs: AuditLogEntry[];
}
