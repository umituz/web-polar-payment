/**
 * createPolarPortalClient — the BillingApiClient binding over a
 * PolarAdapter: summary building, checkout redirect semantics, and the
 * hosted-portal redirect for payment-method operations.
 */

import { describe, it, expect, vi } from 'vitest';
import { createPolarPortalClient } from '../../../src/presentation/portal/polar/create-polar-portal';
import { NoopNavigationStrategy } from '../../../src/presentation/navigation/navigation.strategy';
import type { PolarAdapter } from '../../../src/domain/interfaces';
import type {
  CancelResult,
  CheckoutResult,
  OrderItem,
  SubscriptionStatus,
  SyncResult,
} from '../../../src/domain/entities';

function makeAdapter(overrides: Partial<PolarAdapter> = {}): PolarAdapter {
  return {
    getStatus: vi.fn(async (): Promise<SubscriptionStatus> => ({
      plan: 'plan_pro',
      subscriptionId: 'sub_1',
      subscriptionStatus: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: '2026-11-01T00:00:00Z',
      billingCycle: 'monthly',
      polarCustomerId: 'cus_1',
    })),
    createCheckout: vi.fn(async (): Promise<CheckoutResult> => ({ url: 'https://polar.sh/checkout/co_1', id: 'co_1' })),
    syncSubscription: vi.fn(async (): Promise<SyncResult> => ({ synced: true })),
    getBillingHistory: vi.fn(async (): Promise<OrderItem[]> => [
      {
        id: 'ord_1',
        createdAt: '2026-10-01T12:00:00Z',
        amount: 9900,
        currency: 'eur',
        status: 'paid',
        paid: true,
        productName: 'Professional',
      },
    ]),
    cancelSubscription: vi.fn(async (): Promise<CancelResult> => ({ success: true })),
    getPortalUrl: vi.fn(async (): Promise<string> => 'https://customer.polar.sh/portal'),
    ...overrides,
  };
}

const PRODUCTS = [
  {
    id: 'prod_pro',
    name: 'Professional',
    description: 'Growing teams',
    isRecurring: true,
    recurringInterval: 'monthly' as const,
    isArchived: false,
    organizationId: 'org_1',
    prices: [
      { id: 'price_m', type: 'fixed' as const, amountType: 'fixed' as const, amount: 9900, currency: 'eur', recurringInterval: 'monthly' as const, isArchived: false, productId: 'prod_pro' },
      { id: 'price_y', type: 'fixed' as const, amountType: 'fixed' as const, amount: 95000, currency: 'eur', recurringInterval: 'yearly' as const, isArchived: false, productId: 'prod_pro' },
    ],
    benefits: [],
    metadata: { planId: 'plan_pro' },
    createdAt: '2026-01-01T00:00:00Z',
    modifiedAt: null,
  },
];

describe('createPolarPortalClient', () => {
  it('builds the summary: plan-key lookup via metadata.planId, invoices, upcoming invoice', async () => {
    const adapter = makeAdapter();
    const client = createPolarPortalClient({
      adapter,
      products: PRODUCTS,
      navigation: new NoopNavigationStrategy(),
    });

    const summary = await client.loadBilling();

    // status.plan is the host plan key ('plan_pro'), the tier is resolved
    // through the catalog's metadata.planId tag onto the product's tier.
    expect(summary.subscription.planId).toBe('plan_pro');
    expect(summary.subscription.plan.id).toBe('prod_pro');
    expect(summary.subscription.plan.monthlyPrice).toBe(9900);
    expect(summary.subscription.status).toBe('active');
    expect(summary.upcomingInvoice).toEqual({ amount: 9900, currency: 'EUR', date: '2026-11-01T00:00:00Z' });
    expect(summary.recentInvoices).toHaveLength(1);
    expect(summary.recentInvoices[0]).toMatchObject({ id: 'ord_1', amount: 9900, currency: 'EUR', status: 'paid' });
    expect(summary.paymentMethods).toEqual([]);
  });

  it('keeps invoice currencies outside the preset list verbatim instead of faking USD', async () => {
    const adapter = makeAdapter({
      getBillingHistory: vi.fn(async (): Promise<OrderItem[]> => [
        {
          id: 'ord_sek',
          createdAt: '2026-10-01T12:00:00Z',
          amount: 49000,
          currency: 'sek',
          status: 'paid',
          paid: true,
          productName: 'Professional',
        },
      ]),
    });
    const client = createPolarPortalClient({
      adapter,
      products: PRODUCTS,
      navigation: new NoopNavigationStrategy(),
    });

    const summary = await client.loadBilling();

    expect(summary.recentInvoices[0]).toMatchObject({ id: 'ord_sek', currency: 'SEK' });
  });

  it('starts a checkout and redirects through the strategy', async () => {
    const redirect = vi.fn();
    const adapter = makeAdapter();
    const client = createPolarPortalClient({
      adapter,
      products: PRODUCTS,
      navigation: { redirect },
    });

    await client.selectPlan('prod_pro', 'yearly');
    expect(adapter.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'prod_pro', billingCycle: 'yearly' }),
    );
    expect(redirect).toHaveBeenCalledWith('https://polar.sh/checkout/co_1');
  });

  it('updateCycle re-checkouts the current plan product at the new cycle', async () => {
    const adapter = makeAdapter();
    const client = createPolarPortalClient({
      adapter,
      products: PRODUCTS,
      navigation: new NoopNavigationStrategy(),
    });

    await client.updateCycle('yearly');
    expect(adapter.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'prod_pro', billingCycle: 'yearly' }),
    );
  });

  it('payment-method operations redirect to the hosted portal', async () => {
    const redirect = vi.fn();
    const adapter = makeAdapter();
    const client = createPolarPortalClient({
      adapter,
      products: PRODUCTS,
      navigation: { redirect },
    });

    const method = await client.addPaymentMethod({ type: 'card', last4: '4242', brand: 'Visa', expiryMonth: 12, expiryYear: 30 });
    expect(method.id).toBe('hosted-portal');
    expect(redirect).toHaveBeenCalledWith('https://customer.polar.sh/portal');

    redirect.mockClear();
    await client.removePaymentMethod('irrelevant');
    expect(redirect).toHaveBeenCalledWith('https://customer.polar.sh/portal');
  });

  it('cancels through the adapter', async () => {
    const adapter = makeAdapter();
    const client = createPolarPortalClient({
      adapter,
      products: PRODUCTS,
      navigation: new NoopNavigationStrategy(),
    });
    await client.cancelSubscription();
    expect(adapter.cancelSubscription).toHaveBeenCalled();
  });

  it('falls back to a free tier when no catalog entry matches the plan key', async () => {
    const adapter = makeAdapter({
      getStatus: vi.fn(async (): Promise<SubscriptionStatus> => ({ plan: 'free', subscriptionStatus: 'none' })),
    });
    const client = createPolarPortalClient({
      adapter,
      products: PRODUCTS,
      navigation: new NoopNavigationStrategy(),
    });

    const summary = await client.loadBilling();
    expect(summary.subscription.plan.name).toBe('Free');
    expect(summary.subscription.status).toBe('canceled');
    expect(summary.upcomingInvoice).toBeUndefined();
  });
});
