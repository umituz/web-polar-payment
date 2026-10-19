/**
 * Webhook signature verification — Polar follows the Standard Webhooks
 * specification: `webhook-id`, `webhook-timestamp` and `webhook-signature`
 * headers, where the signature is
 * `v1,base64(HMAC-SHA256(secret, id + "." + timestamp + "." + rawBody))`.
 *
 * Implemented on WebCrypto (`crypto.subtle`) so the same code runs in
 * Cloudflare Workers, Deno and Node >= 18 without a node:crypto dependency.
 * The raw (unparsed) request body must be used — parsing first breaks the
 * byte-for-byte HMAC input.
 */

export interface WebhookHeadersLike {
  get(name: string): string | null | undefined;
}

const KNOWN_SECRET_PREFIXES = ['whsec_', 'polar_whsic_'] as const;

function headerValue(
  headers: WebhookHeadersLike | Record<string, string>,
  name: string,
): string | undefined {
  if (typeof headers.get === 'function') {
    const value = headers.get(name);
    return value ?? undefined;
  }
  const record = headers as Record<string, string>;
  return record[name] ?? record[name.toLowerCase()];
}

function stripSecretPrefix(secret: string): string {
  for (const prefix of KNOWN_SECRET_PREFIXES) {
    if (secret.startsWith(prefix)) return secret.slice(prefix.length);
  }
  return secret;
}

function base64ToBytes(value: string): Uint8Array | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

async function hmacSha256(keyBytes: Uint8Array, payload: string): Promise<string> {
  const cryptoRef = globalThis.crypto;
  if (!cryptoRef?.subtle) {
    throw new Error('WebCrypto (crypto.subtle) is not available in this runtime');
  }
  const key = await cryptoRef.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await cryptoRef.subtle.sign('HMAC', key, encodeUtf8(payload) as BufferSource);
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Candidate HMAC keys: the base64-decoded secret, and the raw UTF-8 bytes. */
function keyCandidates(secret: string): Uint8Array[] {
  const stripped = stripSecretPrefix(secret);
  const decoded = base64ToBytes(stripped);
  const candidates: Uint8Array[] = [];
  if (decoded && decoded.length > 0) candidates.push(decoded);
  const raw = encodeUtf8(secret);
  if (raw.length > 0) candidates.push(raw);
  const rawStripped = encodeUtf8(stripped);
  if (rawStripped.length > 0 && rawStripped.length !== raw.length) candidates.push(rawStripped);
  return candidates;
}

/** Parses `v1,<b64>` entries from a comma-separated signature header. */
function signaturesFromHeader(header: string): string[] {
  return header
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => (part.startsWith('v1,') ? part.slice(3) : part));
}

export interface VerifyWebhookOptions {
  /** Reject deliveries older than this many milliseconds (default: off). */
  toleranceMs?: number;
}

export async function verifyPolarWebhook(
  rawBody: string,
  headers: WebhookHeadersLike | Record<string, string>,
  secret: string,
  options: VerifyWebhookOptions = {},
): Promise<boolean> {
  const id = headerValue(headers, 'webhook-id');
  const timestamp = headerValue(headers, 'webhook-timestamp');
  const signatureHeader = headerValue(headers, 'webhook-signature');
  if (!id || !timestamp || !signatureHeader || !secret) return false;

  if (options.toleranceMs !== undefined) {
    const age = Math.abs(Date.now() - Number(timestamp) * 1000);
    if (!Number.isFinite(age) || age > options.toleranceMs) return false;
  }

  const expectedSignatures = signaturesFromHeader(signatureHeader);
  if (expectedSignatures.length === 0) return false;

  const payload = `${id}.${timestamp}.${rawBody}`;
  for (const key of keyCandidates(secret)) {
    const computed = await hmacSha256(key, payload);
    for (const expected of expectedSignatures) {
      if (timingSafeEqual(computed, expected)) return true;
    }
  }
  return false;
}

/** Length-checked comparison that does not short-circuit on first mismatch. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
