/**
 * Security policies for outbound URLs.
 *
 * Separated from generic validation so the security boundary is obvious and
 * the rules can be extended (CSP, allow-lists) in one place.
 */

const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

export function isValidCheckoutUrl(url: string): boolean {
  return typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'));
}

export function isInsecureUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith('http://');
}

export function isLoopbackHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return LOOPBACK_HOSTS.has(host);
  } catch {
    return false;
  }
}

export function isProductionInsecureUrl(url: string): boolean {
  return isInsecureUrl(url) && !isLoopbackHost(url);
}
