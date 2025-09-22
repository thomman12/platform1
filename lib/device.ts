// lib/device.ts — client-side helpers for same-device verification

const COOKIE_NAME = 'orbi_dt';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day

function setCookie(name: string, value: string, maxAgeSec: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function randomBytesBase64Url(len = 32): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  // base64url without padding
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Base64Url(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input));
  const bytes = new Uint8Array(buf);
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Ensure a device token cookie exists; returns the token (secret, never sent in URL). */
export function getOrCreateDeviceToken(): string {
  let tok = getCookie(COOKIE_NAME);
  if (!tok) {
    tok = randomBytesBase64Url(32); // 256-bit
    setCookie(COOKIE_NAME, tok, COOKIE_MAX_AGE);
  }
  return tok;
}

/** Read device token cookie (or null if absent). */
export function readDeviceToken(): string | null {
  return getCookie(COOKIE_NAME);
}

/** Compute the dt signature we embed in the link (hash of device token). */
export async function currentDtSig(): Promise<string | null> {
  const tok = readDeviceToken();
  if (!tok) return null;
  return sha256Base64Url(tok);
}

/** Rotate device token (use when resending emails). */
export function rotateDeviceToken(): string {
  const tok = randomBytesBase64Url(32);
  setCookie(COOKIE_NAME, tok, COOKIE_MAX_AGE);
  return tok;
}
