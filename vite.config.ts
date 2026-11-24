import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {
  createDefaultManifest,
  createDefaultTemplates,
  createDefaultTools,
} from './src/lib/defaultCatalogs.ts';

export default defineConfig(({command}) => {
  return {
    base: command === 'build' ? './' : '/',
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
      {
        name: 'github-pages-static-artifacts',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          if (!fs.existsSync(distDir)) {
            return;
          }

          fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf8');

          const indexHtml = path.join(distDir, 'index.html');
          if (fs.existsSync(indexHtml)) {
            fs.copyFileSync(indexHtml, path.join(distDir, '404.html'));
          }

          const apiV1Dir = path.join(distDir, 'api', 'v1');
          fs.mkdirSync(apiV1Dir, {recursive: true});

          const catalogsDir = path.resolve(__dirname, 'data', 'catalogs');
          const emitCatalog = (filename: string, fallback: unknown) => {
            const existing = path.join(catalogsDir, filename);
            if (fs.existsSync(existing)) {
              fs.copyFileSync(existing, path.join(apiV1Dir, filename));
            } else {
              fs.writeFileSync(
                path.join(apiV1Dir, filename),
                JSON.stringify(fallback, null, 2),
                'utf8',
              );
            }
          };

          emitCatalog('manifest.json', createDefaultManifest());
          emitCatalog('templates.json', createDefaultTemplates());
          emitCatalog('tools.json', createDefaultTools());
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
