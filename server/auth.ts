import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const AUTH_FILE = path.join(DATA_DIR, 'registry', 'admin_auth.json');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const EPHEMERAL_SECRET = crypto.randomBytes(32);

function getSigningKey(): Buffer {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return crypto.createHash('sha256').update(envSecret).digest();
  }
  return EPHEMERAL_SECRET;
}

interface StoredAdminCredential {
  salt: string;
  hash: string;
  claimed_at: string;
}

function readStoredCredential(): StoredAdminCredential | null {
  if (!fs.existsSync(AUTH_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')) as StoredAdminCredential;
  } catch {
    return null;
  }
}

function saveStoredCredential(cred: StoredAdminCredential): void {
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmp = `${AUTH_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cred, null, 2), 'utf8');
  fs.renameSync(tmp, AUTH_FILE);
}

function hashScrypt(password: string, saltHex: string): Buffer {
  return crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
}

export function getAuthStatus(): { configured: boolean; source: 'env' | 'claimed' | 'unconfigured' } {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass) {
    return { configured: true, source: 'env' };
  }
  if (readStoredCredential()) {
    return { configured: true, source: 'claimed' };
  }
  return { configured: false, source: 'unconfigured' };
}

export function claimInitialAdminPasscode(passcode: string): { token: string; expires_at: string } {
  const status = getAuthStatus();
  if (status.configured) {
    throw new Error('Admin passcode is already configured.');
  }
  const trimmed = passcode.trim();
  if (trimmed.length < 8) {
    throw new Error('Admin passphrase must be at least 8 characters.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashScrypt(trimmed, salt).toString('hex');
  saveStoredCredential({
    salt,
    hash,
    claimed_at: new Date().toISOString(),
  });
  return issueSessionToken();
}

export function verifyAdminPasscode(passcode: string): { token: string; expires_at: string } {
  const trimmed = passcode.trim();
  if (!trimmed) {
    throw new Error('Enter your admin passphrase.');
  }

  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass) {
    const a = crypto.createHash('sha256').update(trimmed).digest();
    const b = crypto.createHash('sha256').update(envPass).digest();
    if (!crypto.timingSafeEqual(a, b)) {
      throw new Error('Invalid admin passphrase.');
    }
    return issueSessionToken();
  }

  const stored = readStoredCredential();
  if (!stored) {
    throw new Error('Admin passphrase has not been configured yet.');
  }

  const derived = hashScrypt(trimmed, stored.salt);
  const expected = Buffer.from(stored.hash, 'hex');
  if (derived.length !== expected.length || !crypto.timingSafeEqual(derived, expected)) {
    throw new Error('Invalid admin passphrase.');
  }
  return issueSessionToken();
}

export function issueSessionToken(): { token: string; expires_at: string } {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({ sub: 'master-admin', exp, jti: crypto.randomBytes(8).toString('hex') }),
    'utf8',
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSigningKey()).update(payload).digest('base64url');
  return {
    token: `${payload}.${sig}`,
    expires_at: new Date(exp).toISOString(),
  };
}

export function verifySessionToken(token: string): boolean {
  if (!token || !token.includes('.')) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getSigningKey()).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
    };
    return parsed.sub === 'master-admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}
