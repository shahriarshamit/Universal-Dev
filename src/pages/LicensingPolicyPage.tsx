import { CheckCircle2, KeyRound, Save, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { api, formatTimestamp } from '../lib/api';
import type { LicenseRecord, LicenseVerifyResponse, ManifestDocument } from '../types';

interface LicensingPolicyPageProps {
  manifest: ManifestDocument;
  licenses: LicenseRecord[];
  onRefreshState: () => Promise<void>;
}

export function LicensingPolicyPage({
  manifest,
  licenses,
  onRefreshState,
}: LicensingPolicyPageProps) {
  const [minVersion, setMinVersion] = useState<string>(manifest.application.minimum_version);
  const [latestVersion, setLatestVersion] = useState<string>(manifest.application.latest_version);
  const [desktopUrl, setDesktopUrl] = useState<string>(manifest.application.download_url);
  const [updateRequired, setUpdateRequired] = useState<boolean>(manifest.application.update_required);
  const [maintenance, setMaintenance] = useState<boolean>(manifest.application.maintenance);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(
    manifest.application.maintenance_message,
  );
  const [licenseRequired, setLicenseRequired] = useState<boolean>(manifest.license.required);
  const [offlineGraceDays, setOfflineGraceDays] = useState<number>(
    manifest.license.offline_grace_days,
  );
  const [policyFeedback, setPolicyFeedback] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);

  const [ownerEmail, setOwnerEmail] = useState<string>('');
  const [plan, setPlan] = useState<LicenseRecord['plan']>('Pro');
  const [graceDays, setGraceDays] = useState<number>(14);
  const [issueError, setIssueError] = useState<string | null>(null);

  const [verifyInput, setVerifyInput] = useState<string>(licenses[0]?.key || '');
  const [verifyResult, setVerifyResult] = useState<LicenseVerifyResponse | null>(null);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setPolicyFeedback(null);
    setPolicyError(null);
    try {
      await api.updateAdminPolicy({
        application: {
          minimum_version: minVersion,
          latest_version: latestVersion,
          download_url: desktopUrl,
          update_required: updateRequired,
          maintenance,
          maintenance_message: maintenanceMessage,
        },
        license: {
          required: licenseRequired,
          offline_grace_days: offlineGraceDays,
        },
      });
      setPolicyFeedback('Client update gate & license rules saved to manifest.json');
      setTimeout(() => setPolicyFeedback(null), 2400);
      await onRefreshState();
    } catch (err) {
      setPolicyError(err instanceof Error ? err.message : 'Failed to save policy');
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueError(null);
    try {
      await api.issueLicense(ownerEmail, plan, graceDays);
      setOwnerEmail('');
      await onRefreshState();
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : 'Unable to issue license');
    }
  };

  const handleVerifyTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.verifyLicense(verifyInput);
    setVerifyResult(res);
    await onRefreshState();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Global Client Policy */}
        <section className="xl:col-span-7 p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)] mb-4">
            Desktop Client Update Gate & Maintenance Control
          </h2>

          <form onSubmit={handleSavePolicy} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Minimum Version</label>
                <input
                  type="text"
                  value={minVersion}
                  onChange={(e) => setMinVersion(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Latest Version</label>
                <input
                  type="text"
                  value={latestVersion}
                  onChange={(e) => setLatestVersion(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Offline Grace (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={offlineGraceDays}
                  onChange={(e) => setOfflineGraceDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs tabular-nums text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">
                Windows Desktop Installer Download URL
              </label>
              <input
                type="url"
                value={desktopUrl}
                onChange={(e) => setDesktopUrl(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
              />
            </div>

            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateRequired}
                  onChange={(e) => setUpdateRequired(e.target.checked)}
                />
                <span>Force client upgrade</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={licenseRequired}
                  onChange={(e) => setLicenseRequired(e.target.checked)}
                />
                <span>Require valid license key</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenance}
                  onChange={(e) => setMaintenance(e.target.checked)}
                />
                <span>Enable maintenance lock</span>
              </label>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Maintenance Message</label>
              <input
                type="text"
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="Registry maintenance in progress. Try again shortly."
                className="w-full px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)]"
              />
            </div>

            {policyError && <p className="text-xs text-red-400">{policyError}</p>}
            {policyFeedback && <p className="text-xs text-emerald-500">{policyFeedback}</p>}

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Policy</span>
            </button>
          </form>
        </section>

        {/* Live License Verification Tester */}
        <section className="xl:col-span-5 p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
              License Verification Endpoint Tester
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Tests POST /api/v1/license/verify as called by the PySide6 desktop client.
            </p>
          </div>

          <form onSubmit={handleVerifyTest} className="flex gap-2">
            <input
              type="text"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder="UDEV-PRO-2026-94F1"
              className="flex-1 px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium whitespace-nowrap"
            >
              Verify Key
            </button>
          </form>

          {verifyResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                {verifyResult.valid ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Valid · {verifyResult.plan} ({verifyResult.owner})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-red-500">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Rejected · {verifyResult.status}</span>
                  </span>
                )}
              </div>
              <pre className="p-3 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-secondary)] overflow-x-auto">
                {JSON.stringify(verifyResult, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </div>

      {/* License Key Registry */}
      <section className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-hairline)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
              Issued License Keys
            </h2>
          </div>

          <form onSubmit={handleIssue} className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              required
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="owner@domain.com"
              className="px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)]"
            />
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as LicenseRecord['plan'])}
              className="px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)]"
            >
              <option value="Community">Community</option>
              <option value="Pro">Pro</option>
              <option value="Team">Team</option>
            </select>
            <input
              type="number"
              min={1}
              max={90}
              value={graceDays}
              onChange={(e) => setGraceDays(Number(e.target.value))}
              aria-label="Offline grace days"
              className="w-20 px-2.5 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs tabular-nums text-[var(--text-primary)]"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium whitespace-nowrap"
            >
              Issue Key
            </button>
          </form>
        </div>

        {issueError && (
          <div className="px-5 py-2.5 text-xs text-red-400 border-b border-[var(--border-hairline)]">
            {issueError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] text-[var(--text-muted)]">
                <th className="py-2.5 px-5">License Key</th>
                <th className="py-2.5 px-4">Owner</th>
                <th className="py-2.5 px-4">Plan</th>
                <th className="py-2.5 px-4">Grace</th>
                <th className="py-2.5 px-4">Last Verified</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {licenses.map((lic) => (
                <tr key={lic.key}>
                  <td className="py-3 px-5 font-mono text-[var(--text-primary)]">{lic.key}</td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{lic.owner}</td>
                  <td className="py-3 px-4 text-[var(--text-primary)]">{lic.plan}</td>
                  <td className="py-3 px-4 tabular-nums text-[var(--text-secondary)]">
                    {lic.offline_grace_days}d
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-[var(--text-muted)]">
                    {lic.last_verified_at ? formatTimestamp(lic.last_verified_at) : 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={lic.status === 'active' ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}>
                      {lic.status === 'active' ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setVerifyInput(lic.key)}
                      className="px-2.5 py-1 rounded border border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.toggleLicense(lic.key);
                        await onRefreshState();
                      }}
                      className="px-2.5 py-1 rounded border border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    >
                      {lic.status === 'active' ? 'Revoke' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
