import { describe, it, expect } from 'vitest';
import { createHttpAdapter } from '../../src/infrastructure/services/http/create-http-adapter';

interface Captured {
  url: string;
  init: RequestInit;
}

function fetchReturning(body: unknown, status = 200) {
  const captured: Captured[] = [];
  const fetchImpl = (async (url: string | URL | Request, init: RequestInit = {}) => {
    captured.push({ url: String(url), init });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  return { fetchImpl, captured };
}

describe('createHttpAdapter', () => {
  it('reads status with userId in the query', async () => {
    const { fetchImpl, captured } = fetchReturning({ plan: 'pro', subscriptionStatus: 'active' });
    const adapter = createHttpAdapter({ baseUrl: '/api/billing', fetchImpl });

    const status = await adapter.getStatus('org_1');
    expect(status).toEqual({ plan: 'pro', subscriptionStatus: 'active' });
    expect(captured[0].url).toBe('/api/billing/status?userId=org_1');
    expect(captured[0].init.method).toBe('GET');
  });

  it('falls back to getUserId when the SDK passes no id', async () => {
    const { fetchImpl, captured } = fetchReturning({ synced: true });
    const adapter = createHttpAdapter({ fetchImpl, getUserId: () => 'org_2' });

    await adapter.syncSubscription('');
    expect(captured[0].url).toBe('/api/billing/sync');
    expect(JSON.parse(String(captured[0].init.body))).toEqual({ userId: 'org_2' });
  });

  it('posts checkout parameters as JSON', async () => {
    const { fetchImpl, captured } = fetchReturning({ id: 'co_1', url: 'https://polar.sh/checkout/co_1' });
    const adapter = createHttpAdapter({ fetchImpl });

    const result = await adapter.createCheckout({ productId: 'prod_1', billingCycle: 'monthly' });
    expect(result).toEqual({ id: 'co_1', url: 'https://polar.sh/checkout/co_1' });
    expect(captured[0].init.method).toBe('POST');
    expect(JSON.parse(String(captured[0].init.body))).toEqual({
      productId: 'prod_1',
      billingCycle: 'monthly',
    });
  });

  it('accepts both array and enveloped history payloads', async () => {
    const orders = [{ id: 'o1', createdAt: '2026-10-19', amount: 9900, currency: 'usd', status: 'paid', paid: true, productName: 'Pro' }];
    const plain = fetchReturning(orders);
    expect(await createHttpAdapter({ fetchImpl: plain.fetchImpl }).getBillingHistory('u')).toEqual(orders);

    const enveloped = fetchReturning({ items: orders });
    expect(await createHttpAdapter({ fetchImpl: enveloped.fetchImpl }).getBillingHistory('u')).toEqual(orders);
  });

  it('unwraps portal url objects', async () => {
    const { fetchImpl } = fetchReturning({ url: 'https://customer.polar.sh/portal' });
    const adapter = createHttpAdapter({ fetchImpl });
    await expect(adapter.getPortalUrl('u')).resolves.toBe('https://customer.polar.sh/portal');
  });

  it('surfaces the server error envelope on failure', async () => {
    const { fetchImpl } = fetchReturning({ error: 'Billing not configured' }, 503);
    const adapter = createHttpAdapter({ fetchImpl });
    await expect(adapter.getStatus('u')).rejects.toThrow('Billing not configured (HTTP 503)');
  });

  it('sends extra headers from getHeaders', async () => {
    const { fetchImpl, captured } = fetchReturning({ plan: 'free', subscriptionStatus: 'none' });
    const adapter = createHttpAdapter({ fetchImpl, getHeaders: () => ({ 'X-Trace': 't1' }) });
    await adapter.getStatus('u');
    expect(new Headers(captured[0].init.headers).get('X-Trace')).toBe('t1');
  });
});
