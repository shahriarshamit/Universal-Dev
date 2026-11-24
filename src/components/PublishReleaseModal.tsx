import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ManifestDocument, ManifestSdkVersion, SdkId } from '../types';

interface PublishReleaseModalProps {
  open: boolean;
  manifest: ManifestDocument;
  onClose: () => void;
  onPublished: () => Promise<void>;
}

export function PublishReleaseModal({
  open,
  manifest,
  onClose,
  onPublished,
}: PublishReleaseModalProps) {
  const [sdkId, setSdkId] = useState<SdkId>('php');
  const [version, setVersion] = useState<string>('8.4.25');
  const [channel, setChannel] = useState<ManifestSdkVersion['channel']>('stable');
  const [status, setStatus] = useState<ManifestSdkVersion['status']>('supported');
  const [platform, setPlatform] = useState<string>('windows');
  const [architecture, setArchitecture] = useState<string>('x64');
  const [downloadUrl, setDownloadUrl] = useState<string>(
    'https://windows.php.net/downloads/releases/php-8.4.25-Win32-vs17-x64.zip',
  );
  const [sha256, setSha256] = useState<string>(
    '4d7c1e9f8a2245b16a3f88d10e9a50d23c1b9e84c6f9b8c7d2e10a44b2c1d999',
  );
  const [sizeBytes, setSizeBytes] = useState<number>(32500000);
  const [dependenciesText, setDependenciesText] = useState<string>('');
  const [executable, setExecutable] = useState<string>('php.exe');
  const [verifyArgs, setVerifyArgs] = useState<string>('-v');
  const [verifyContains, setVerifyContains] = useState<string>('PHP 8.4.25');
  const [stripRoot, setStripRoot] = useState<boolean>(false);
  const [recommended, setRecommended] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const template = manifest.sdks[sdkId]?.versions[0];
    if (!template) return;
    setPlatform(template.platform);
    setArchitecture(template.architecture);
    setExecutable(template.runtime.executable);
    setVerifyArgs(template.runtime.verify.args.join(' '));
    setDependenciesText(template.dependencies.join(', '));
    setStripRoot(template.installation.strip_root_folder);
  }, [sdkId, manifest]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.publishManifestVersion({
        sdk_id: sdkId,
        version,
        channel,
        status,
        platform,
        architecture,
        download_url: downloadUrl,
        sha256,
        size: sizeBytes,
        dependencies: dependenciesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        executable,
        verify_args: verifyArgs.split(/\s+/).filter(Boolean),
        verify_contains: verifyContains,
        strip_root_folder: stripRoot,
        recommended,
      });
      await onPublished();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish release.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Publish SDK / Tool Release to manifest.json
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[76vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">SDK / Tool</label>
              <select
                value={sdkId}
                onChange={(e) => setSdkId(e.target.value as SdkId)}
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)]"
              >
                {(Object.keys(manifest.sdks) as SdkId[]).map((id) => (
                  <option key={id} value={id}>
                    {manifest.sdks[id].name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Archive Size (bytes)</label>
              <input
                type="number"
                min={1024}
                value={sizeBytes}
                onChange={(e) => setSizeBytes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs tabular-nums text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as ManifestSdkVersion['channel'])}
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)]"
              >
                <option value="stable">stable</option>
                <option value="lts">lts</option>
                <option value="beta">beta</option>
                <option value="nightly">nightly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ManifestSdkVersion['status'])}
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)]"
              >
                <option value="supported">supported</option>
                <option value="beta">beta</option>
                <option value="deprecated">deprecated</option>
                <option value="unsupported">unsupported</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Platform</label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Architecture</label>
              <input
                type="text"
                value={architecture}
                onChange={(e) => setArchitecture(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Archive Download URL</label>
            <input
              type="url"
              required
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">SHA-256 Checksum (64 hex chars)</label>
            <input
              type="text"
              required
              value={sha256}
              onChange={(e) => setSha256(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Executable</label>
              <input
                type="text"
                value={executable}
                onChange={(e) => setExecutable(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Verify Args</label>
              <input
                type="text"
                value={verifyArgs}
                onChange={(e) => setVerifyArgs(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Dependencies (comma)</label>
              <input
                type="text"
                value={dependenciesText}
                onChange={(e) => setDependenciesText(e.target.value)}
                placeholder="e.g. git"
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Verify Output Contains</label>
            <input
              type="text"
              value={verifyContains}
              onChange={(e) => setVerifyContains(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
              <input
                type="checkbox"
                checked={recommended}
                onChange={(e) => setRecommended(e.target.checked)}
              />
              <span>Set as recommended default version</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
              <input
                type="checkbox"
                checked={stripRoot}
                onChange={(e) => setStripRoot(e.target.checked)}
              />
              <span>Strip root archive folder on extraction</span>
            </label>
          </div>

          {error && (
            <div className="p-3 rounded border border-red-500/40 bg-red-500/10 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[var(--border-hairline)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{submitting ? 'Publishing…' : 'Publish Release'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
