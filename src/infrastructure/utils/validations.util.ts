export function normalizeUserId(userId: string | undefined): string | undefined {
  if (typeof userId !== 'string') return undefined;
  const trimmed = userId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isValidProductId(productId: unknown): productId is string {
  return typeof productId === 'string' && productId.trim().length > 0;
}

export function isValidCheckoutUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://');
}

export function isProductionInsecureUrl(url: string): boolean {
  return url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1');
}
