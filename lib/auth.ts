// ============================================================================
// Autenticación simple basada en cookies firmadas (sin dependencias externas
// de sesión). Usa la Web Crypto API (crypto.subtle), disponible tanto en
// runtime Node (Server Actions, Server Components) como en el runtime Edge
// (middleware.ts) — por eso este archivo NO puede importar cosas de Node
// como "crypto" o "buffer".
//
// Solo se permite iniciar sesión / registrarse con correos institucionales
// que terminen en "@inacapmail.cl".
// ============================================================================

export const ALLOWED_EMAIL_DOMAIN = "@inacapmail.cl";
export const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 días

export type SessionPayload = {
  sub: string; // id de usuario
  email: string;
  nombre: string;
  exp: number; // unix seconds
};

export function isAllowedEmail(email: string) {
  return email.trim().toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Falta la variable de entorno AUTH_SECRET. Defínela en tu archivo .env (ver .env.example)."
    );
  }
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  const b64 = btoa(str);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payloadB64: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return bytesToBase64Url(new Uint8Array(sig));
}

/** Crea el valor de cookie firmado a partir de los datos del usuario. */
export async function createSessionToken(user: { id: string; email: string; nombre: string }): Promise<string> {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    nombre: user.nombre,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  };
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await sign(payloadB64, getSecret());
  return `${payloadB64}.${sig}`;
}

/** Verifica un token de cookie. Devuelve el payload si es válido y no ha expirado, si no `null`. */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  try {
    const expectedSig = await sign(payloadB64, getSecret());
    if (expectedSig !== sig) return null;
    const json = new TextDecoder().decode(base64UrlToBytes(payloadB64));
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_SEC;
