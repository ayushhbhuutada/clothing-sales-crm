import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query, queryOne, run } from '../db/database';

export type StaffRole = 'receptionist' | 'sales_rep' | 'store_manager' | 'admin' | 'owner';
export const MANAGER_ROLES: StaffRole[] = ['store_manager', 'admin', 'owner'];

export interface AuthStaff {
  id: string;
  name: string;
  role: StaffRole;
  branch_id: string;
}

const SESSION_TTL = '12h'; // one shop shift
const SSE_TICKET_TTL = '60s';
const PIN_HASH_PREFIX = 'scrypt$';
const JWT_SECRET_SETTING = 'jwt_secret';

let jwtSecret: string | null = null;

// Must run after the database is initialised. Uses JWT_SECRET when provided (32+ chars);
// otherwise generates a random secret once and keeps it in app_settings (replicated to Turso),
// so sessions survive restarts and redeploys without any manual configuration.
export function initJwtSecret(): void {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 32) {
    jwtSecret = envSecret;
    console.log('🔑 Using JWT_SECRET from environment.');
    return;
  }
  if (envSecret) {
    console.warn('⚠️ JWT_SECRET is shorter than 32 characters; ignoring it and using the stored secret.');
  }

  const stored = queryOne<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [JWT_SECRET_SETTING]);
  if (stored?.value && stored.value.length >= 32) {
    jwtSecret = stored.value;
    console.log('🔑 Using stored JWT secret.');
    return;
  }

  jwtSecret = crypto.randomBytes(48).toString('hex');
  run('INSERT OR REPLACE INTO app_settings (key, value, created_at) VALUES (?, ?, ?)', [
    JWT_SECRET_SETTING, jwtSecret, new Date().toISOString()
  ]);
  console.log('🔑 Generated and stored a new JWT secret.');
}

function getJwtSecret(): string {
  if (!jwtSecret) throw new Error('JWT secret not initialised');
  return jwtSecret;
}

export function isManager(role: string): boolean {
  return MANAGER_ROLES.includes(role as StaffRole);
}

// --- Session tokens ---

export function signSessionToken(staff: AuthStaff): string {
  return jwt.sign(
    { sub: staff.id, role: staff.role, branch_id: staff.branch_id, typ: 'session' },
    getJwtSecret(),
    { expiresIn: SESSION_TTL, algorithm: 'HS256' }
  );
}

// Short-lived ticket so the SSE stream (EventSource cannot send headers) never carries the session token in its URL
export function signSseTicket(staffId: string): string {
  return jwt.sign({ sub: staffId, typ: 'sse' }, getJwtSecret(), { expiresIn: SSE_TICKET_TTL, algorithm: 'HS256' });
}

export function verifyToken(token: string, expectedType: 'session' | 'sse'): string | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (payload.typ !== expectedType || typeof payload.sub !== 'string') return null;
    return payload.sub;
  } catch {
    return null;
  }
}

// --- PIN hashing (scrypt, built into Node) ---

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pin, salt, 32);
  return `${PIN_HASH_PREFIX}${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  if (!stored || !stored.startsWith(PIN_HASH_PREFIX)) return false;
  const [, saltHex, hashHex] = stored.split('$');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(pin, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

// One-time upgrade of any plain-text PINs (seed data or older databases) to scrypt hashes
export function migratePlaintextPins(): void {
  const plain = query<{ id: string; pin_code: string }>(
    `SELECT id, pin_code FROM staff WHERE pin_code NOT LIKE '${PIN_HASH_PREFIX}%'`
  );
  for (const s of plain) {
    run('UPDATE staff SET pin_code = ? WHERE id = ?', [hashPin(String(s.pin_code).trim()), s.id]);
  }
  if (plain.length > 0) {
    console.log(`🔐 Hashed ${plain.length} plain-text staff PIN(s).`);
  }
}
