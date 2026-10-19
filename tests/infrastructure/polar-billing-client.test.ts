import { describe, it, expect } from 'vitest';
import { PolarBillingClient } from '../../src/infrastructure/services/polar-billing.client';
import { PolarApiError } from '../../src/infrastructure/services/polar-product.repository';
import type { HttpClient, HttpRequest, HttpResponse } from '../../src/infrastructure/http/http-client';

function httpClientReturning(data: unknown, status = 200): HttpClient & { calls: HttpRequest[] } {
  const calls: HttpRequest[] = [];
  const text = JSON.stringify(data);
  const client = {
    async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
      calls.push(request);
      return {
        status,
        ok: status >= 200 && status < 300,
        data: (status >= 200 && status < 300 ? data : null) as T | null,
        text: async () => text,
      };
    },
  };
  return Object.assign(client, { calls });
}

describe('PolarBillingClient', () => {
  it('creates a checkout with snake_case body and Bearer auth', async () => {
    const http = httpClientReturning({ id: 'co_1', url: 'https://polar.sh/checkout/co_1', status: 'open' });
    const client = new PolarBillingClient({ apiToken: 'oat_test', http });

    const checkout = await client.createCheckout({
      productId: 'prod_1',
      successUrl: 'https://app.example/billing/return?checkout_id={CHECKOUT_ID}',
      metadata: { tenant: 'org_1' },
    });

    expect(checkout).toMatchObject({ id: 'co_1', url: 'https://polar.sh/checkout/co_1' });
    const call = http.calls[0];
    expect(call.method).toBe('POST');
    expect(call.url).toBe('https://api.polar.sh/v1/checkouts');
    expect(call.headers?.Authorization).toBe('Bearer oat_test');
    expect(call.body).toEqual({
      product_id: 'prod_1',
      success_url: 'https://app.example/billing/return?checkout_id={CHECKOUT_ID}',
      metadata: { tenant: 'org_1' },
    });
  });

  it('targets the sandbox base URL when configured', async () => {
    const http = httpClientReturning({ id: 'co_2', url: 'https://sandbox.polar.sh/checkout/co_2' });
    const client = new PolarBillingClient({ apiToken: 'oat_test', sandbox: true, http });
    await client.createCheckout({ productId: 'prod_1' });
    expect(http.calls[0].url.startsWith('https://sandbox-api.polar.sh/v1')).toBe(true);
  });

  it('maps a subscription DTO to camelCase', async () => {
    const http = httpClientReturning({
      id: 'sub_1',
      status: 'active',
      product_id: 'prod_1',
      amount: 9900,
      currency: 'usd',
      current_period_end: '2026-11-01T00:00:00Z',
      cancel_at_period_end: false,
      customer_id: 'cus_1',
      metadata: { tenant: 'org_1' },
    });
    const client = new PolarBillingClient({ apiToken: 'oat_test', http });
    const record = await client.getSubscription('sub_1');
    expect(record).toEqual({
      id: 'sub_1',
      status: 'active',
      productId: 'prod_1',
      amountCents: 9900,
      currency: 'usd',
      currentPeriodStart: undefined,
      currentPeriodEnd: '2026-11-01T00:00:00Z',
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endsAt: null,
      startedAt: undefined,
      customerId: 'cus_1',
      metadata: { tenant: 'org_1' },
    });
  });

  it('sends cancel_at_period_end on update and query filters on list', async () => {
    const http = httpClientReturning(
      { id: 'sub_1', status: 'active', product_id: 'p', amount: 1, currency: 'usd', cancel_at_period_end: true, customer_id: 'c', metadata: {} },
    );
    const client = new PolarBillingClient({ apiToken: 'oat_test', http });

    await client.updateSubscription('sub_1', { cancelAtPeriodEnd: true });
    expect(http.calls[0].method).toBe('PATCH');
    expect(http.calls[0].url).toBe('https://api.polar.sh/v1/subscriptions/sub_1');
    expect(http.calls[0].body).toEqual({ cancel_at_period_end: true });

    await client.listSubscriptions({ customerId: 'cus_9' });
    expect(http.calls[1].url).toBe('https://api.polar.sh/v1/subscriptions?customer_id=cus_9');
  });

  it('creates a portal session and surfaces a missing URL as an error', async () => {
    const http = httpClientReturning({ url: 'https://customer.polar.sh/portal?token=abc' });
    const client = new PolarBillingClient({ apiToken: 'oat_test', http });
    const portal = await client.createPortalSession('cus_1', 'https://app.example/billing');
    expect(portal.url).toContain('customer.polar.sh');
    expect(http.calls[0].url).toBe('https://api.polar.sh/v1/customer-sessions/cus_1/portal');
    expect(http.calls[0].body).toEqual({ returnURL: 'https://app.example/billing' });

    const broken = httpClientReturning({});
    const failing = new PolarBillingClient({ apiToken: 'oat_test', http: broken });
    await expect(failing.createPortalSession('cus_1')).rejects.toBeInstanceOf(PolarApiError);
  });

  it('wraps non-2xx responses in PolarApiError with the body attached', async () => {
    const http = httpClientReturning({ error: 'not found' }, 404);
    const client = new PolarBillingClient({ apiToken: 'oat_test', http });
    const thrown = await client.getCheckout('co_missing').catch((error: unknown) => error);
    expect(thrown).toBeInstanceOf(PolarApiError);
    expect((thrown as PolarApiError).status).toBe(404);
    expect((thrown as PolarApiError).body).toContain('not found');
  });
});
