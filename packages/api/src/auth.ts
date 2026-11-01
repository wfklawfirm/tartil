import { Buffer } from 'node:buffer';
import { scrypt, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${(await scryptAsync(pw, salt, 64)).toString('base64')}`;
}
export async function verifyPassword(pw: string, stored: string | null): Promise<boolean> {
  if (!stored) { await scryptAsync(pw, randomBytes(16), 64); return false; }   // keep timing similar for unknown users
  const [, s, h] = stored.split('$');
  const got = await scryptAsync(pw, Buffer.from(s!, 'base64'), 64);
  const want = Buffer.from(h!, 'base64');
  return got.length === want.length && timingSafeEqual(got, want);
}
const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');
export function signToken(sub: string, secret: string, ttlSec = 3600, now = Date.now()): string {
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ sub, im: now, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + ttlSec }));
  return `${head}.${body}.${b64u(createHmac('sha256', secret).update(`${head}.${body}`).digest())}`;
}
export function verifyToken(tok: string, secret: string, now = Date.now()): string | null {
  const p = tok.split('.'); if (p.length !== 3) return null;
  const exp = createHmac('sha256', secret).update(`${p[0]}.${p[1]}`).digest();
  const got = Buffer.from(p[2]!, 'base64url');
  if (got.length !== exp.length || !timingSafeEqual(got, exp)) return null;
  try {
    const c = JSON.parse(Buffer.from(p[1]!, 'base64url').toString()) as { sub: string; exp: number };
    return c.exp * 1000 > now ? c.sub : null;
  } catch { return null; }
}
export function verifyTokenFull(tok: string, secret: string, now = Date.now()): { sub: string; issuedMs: number } | null {
  const sub = verifyToken(tok, secret, now); if (!sub) return null;
  const c = JSON.parse(Buffer.from(tok.split('.')[1]!, 'base64url').toString()) as { iat: number; im?: number };
  return { sub, issuedMs: c.im ?? c.iat * 1000 };
}
