import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import type {
  EcosystemId,
  LicenseRecord,
  ManifestApplicationPolicy,
  ManifestLicensePolicy,
  ManifestSdkVersion,
  SdkId,
} from './src/types.ts';
import { MasterAdminStore } from './server/store.ts';

const PORT = 3000;
const app = express();
const store = new MasterAdminStore();

app.use(express.json({ limit: '1mb' }));

// --- Public Desktop Client APIs (consumed by the PySide6 Desktop App) ---

app.get('/api/v1/manifest.json', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(store.getManifest());
});

app.get('/api/v1/templates.json', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(store.getTemplates());
});

app.get('/api/v1/tools.json', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(store.getTools());
});

app.post('/api/v1/client/bootstrap', (req, res) => {
  try {
    const body = req.body as {
      client_version?: string;
      license_key?: string;
      platform?: string;
    };
    res.json(store.evaluateClientBootstrap(body ?? {}));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Bootstrap check failed' });
  }
});

app.post('/api/v1/license/verify', (req, res) => {
  try {
    const { key } = req.body as { key?: string };
    res.json(store.verifyLicense(key || ''));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'License verification failed' });
  }
});

// --- Master Admin Control Plane APIs ---

app.get('/api/admin/state', (_req, res) => {
  res.json(store.getAdminState());
});

app.post('/api/admin/manifest/version', (req, res) => {
  try {
    const body = req.body as {
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
    };
    res.json(store.upsertManifestVersion(body));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to publish release' });
  }
});

app.patch('/api/admin/manifest/version', (req, res) => {
  try {
    const body = req.body as {
      sdk_id: SdkId;
      version: string;
      status?: ManifestSdkVersion['status'];
      set_default?: boolean;
    };
    res.json(store.patchManifestVersionState(body));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update release' });
  }
});

app.delete('/api/admin/manifest/version', (req, res) => {
  try {
    const { sdk_id, version } = req.body as { sdk_id: SdkId; version: string };
    res.json(store.deleteManifestVersion(sdk_id, version));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete release' });
  }
});

app.patch('/api/admin/manifest/meta', (req, res) => {
  try {
    const body = req.body as {
      provider?: string;
      cdn?: string;
      minimum_client_version?: string;
    };
    res.json(store.updateManifestMetadata(body));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update metadata' });
  }
});

app.post('/api/admin/templates', (req, res) => {
  try {
    const body = req.body as {
      id: string;
      sdk: EcosystemId;
      name: string;
      description: string;
      steps: Array<{ tool: string; label: string; arguments: string[] }>;
    };
    res.json(store.upsertTemplate(body));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save template' });
  }
});

app.delete('/api/admin/templates/:id', (req, res) => {
  try {
    res.json(store.deleteTemplate(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete template' });
  }
});

app.patch('/api/admin/policy', (req, res) => {
  try {
    const body = req.body as {
      application?: Partial<ManifestApplicationPolicy>;
      license?: Partial<ManifestLicensePolicy>;
    };
    res.json(store.updateAdminPolicy(body));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Policy update failed' });
  }
});

app.post('/api/admin/licenses', (req, res) => {
  try {
    const { owner, plan, offline_grace_days } = req.body as {
      owner: string;
      plan: LicenseRecord['plan'];
      offline_grace_days: number;
    };
    res.json(store.issueLicense(owner, plan, offline_grace_days));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'License issuance failed' });
  }
});

app.post('/api/admin/licenses/:key/toggle', (req, res) => {
  try {
    res.json(store.toggleLicenseStatus(req.params.key));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'License update failed' });
  }
});

app.delete('/api/admin/logs', (_req, res) => {
  store.clearLogs();
  res.json({ ok: true });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(process.cwd(), 'dist');
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: { server: httpServer },
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Universal Dev Master Admin server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
