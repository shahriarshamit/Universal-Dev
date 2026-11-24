# Universal Dev

**Universal Dev** is the official web portal, SDK manifest distribution hub, and Master Admin control plane for the Universal Dev PySide6 desktop workspace.

It manages isolated multi-stack development runtimes (**PHP**, **Node.js**, **Python**, **Flutter**, plus bundled **Git** and **Composer**), starter templates, license verification policies, and client bootstrap endpoints.

---

## Features

- **Public Product Landing Page**: Showcases Universal Dev's zero-host-PATH architecture, live SDK catalog (`manifest.json`), static JSON endpoint links, Python client integration snippet, and an interactive license key checker.
- **Master Admin Authentication**:
  - Self-hosted Node/Express server uses `scrypt` / `timingSafeEqual` passphrase hashing and HMAC-SHA256 Bearer session tokens (configured via `ADMIN_PASSCODE` or claimed atomically on first run via `/api/auth/setup`).
  - Static GitHub Pages builds use Web Crypto PBKDF2 (`SHA-256`, 100,000 iterations) with in-memory session tokens for browser-side catalog editing and JSON export.
- **Remote Manifest & Catalog Publishing**: Publish new SDK versions with SHA-256 digests, toggle default versions, edit starter templates (`templates.json`) and tool definitions (`tools.json`), enforce minimum desktop client versions or maintenance mode, and export updated JSON files.
- **GitHub Pages Ready (Zero-Build Hosting)**: Builds with relative `./` asset paths and writes prebuilt static bundles (including `.nojekyll`, `404.html`, and `/api/v1/{manifest,templates,tools}.json`) into both `dist/` and `docs/` so GitHub does not need to install dependencies or run a build workflow.

---

## GitHub Pages Deployment (Prebuilt, No CI Build Needed)

Both `dist/` and `docs/` are prebuilt and tracked in the repository:

1. Build locally whenever you change source code (`npm run build` updates both `dist/` and `docs/`).
2. Commit and push to GitHub (`main` branch).
3. In your GitHub repository, open **Settings -> Pages**.
4. Under **Build and deployment -> Source**, select **Deploy from a branch**, choose **`main`** and folder **`/docs`**, and click **Save**.

> **Optional Actions mode**: If you prefer **Source: GitHub Actions**, `.github/workflows/deploy.yml` is configured for manual `workflow_dispatch` and uploads the committed `dist/` folder directly without running `npm install` or `npm run build`.

Once deployed, your site and static desktop endpoints are available at:

- Portal: `https://<username>.github.io/<repository>/`
- Manifest feed: `https://<username>.github.io/<repository>/api/v1/manifest.json`
- Templates feed: `https://<username>.github.io/<repository>/api/v1/templates.json`
- Tools feed: `https://<username>.github.io/<repository>/api/v1/tools.json`

> **Updating catalogs on GitHub Pages**: Because GitHub Pages serves static files, edits made inside Master Admin on a live GitHub Pages deployment are saved in your browser and can be exported/committed to `data/catalogs/` (or rebuilt via `npm run build`) to publish globally.

---

## Local Development & Self-Hosted Express Server

Running the Node.js + Express backend enables live server-side persistence under `data/`, real `/api/v1/client/bootstrap` and `/api/v1/license/verify` endpoints, and server-side Master Admin authentication.

### Prerequisites

- **Node.js** 20+ (Node 22 recommended)

### Setup & Run

```bash
# Install dependencies
npm install

# Optional: configure environment variables
cp .env.example .env
# Set ADMIN_PASSCODE (min. 8 characters) in .env, or claim one in the browser on first visit

# Start development server (Express + Vite middleware on port 3000)
npm run dev
```

### Production Build & Start

```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `ADMIN_PASSCODE` | Optional | Master Admin passphrase for `/api/auth/login`. If omitted, the first visitor claims the initial passphrase via the First-Run Setup screen (saved hashed in `data/registry/admin_auth.json`). |
| `SESSION_SECRET` | Optional | Secret used to sign HMAC-SHA256 admin session tokens (defaults to an ephemeral cryptographic secret generated per process start). |

---

## Desktop Client Integration (PySide6)

Point the Python desktop application at either your GitHub Pages URL or self-hosted Express server:

```python
import requests

BASE_URL = "https://<username>.github.io/<repository>"

manifest = requests.get(f"{BASE_URL}/api/v1/manifest.json", timeout=10).json()
templates = requests.get(f"{BASE_URL}/api/v1/templates.json", timeout=10).json()
tools = requests.get(f"{BASE_URL}/api/v1/tools.json", timeout=10).json()

print("Desktop minimum version:", manifest["application"]["minimum_version"])
print("Default Python SDK:", manifest["sdks"]["python"]["default_version"])
```

---

## Project Structure

```text
.
├── .github/workflows/deploy.yml   # GitHub Pages build & deploy workflow
├── server.ts                      # Express API server & Vite dev/static host (port 3000)
├── server/
│   ├── auth.ts                    # scrypt passphrase verification & HMAC-SHA256 tokens
│   ├── catalogs.ts                # Server catalog wrappers
│   └── store.ts                   # JSON disk persistence (data/catalogs, registry, logs)
├── src/
│   ├── components/                # TopBar, Sidebar, Modals, ConfirmDialog
│   ├── lib/
│   │   ├── api.ts                 # Dual-mode API client (Express + GitHub Pages static fallback)
│   │   └── defaultCatalogs.ts     # Shared manifest, templates, tools & license seed data
│   └── pages/
│       ├── LandingPage.tsx        # Public landing page & license checker
│       ├── LoginPage.tsx          # Master Admin sign-in & first-run passphrase setup
│       ├── OverviewPortalPage.tsx # Control plane overview & bootstrap simulator
│       ├── ReleasesCatalogPage.tsx# SDK version & SHA-256 manager
│       ├── TemplatesToolsPage.tsx # Project template & CLI tool registry
│       ├── LicensingPolicyPage.tsx# Client version policy & license key management
│       └── AuditLogsPage.tsx      # Governance & bootstrap audit trail
└── vite.config.ts                 # Relative ./ base build & dist/api/v1/*.json emitter
```
