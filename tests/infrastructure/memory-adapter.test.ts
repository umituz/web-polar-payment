import { describe, it, expect, vi } from 'vitest';
import { createMemoryPolarAdapter } from '../../src/infrastructure/services/memory/create-memory-adapter';

describe('createMemoryPolarAdapter', () => {
  it('starts with default inactive free status', async () => {
    const adapter = createMemoryPolarAdapter();
    const status = await adapter.getStatus('user_1');
    expect(status.plan).toBe('free');
    expect(status.subscriptionStatus).toBe('none');
  });

  it('updates status and records history upon checkout', async () => {
    const onCheckout = vi.fn();
    const adapter = createMemoryPolarAdapter({ onCheckout });

    const checkout = await adapter.createCheckout({
      productId: 'prod_pro_10',
      planKey: 'pro_10',
      billingCycle: 'monthly',
      seats: 10,
      customerEmail: 'teacher@hangora.test',
      metadata: { tier: 'pro_10' },
      successUrl: 'https://hangora.test/app/studio?session_id={CHECKOUT_ID}',
    });

    expect(checkout.id).toMatch(/^chk_/);
    expect(checkout.url).toContain(checkout.id);
    expect(onCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'prod_pro_10',
        planKey: 'pro_10',
        seats: 10,
      }),
    );

    const status = await adapter.getStatus('user_1');
    expect(status.plan).toBe('pro_10');
    expect(status.subscriptionStatus).toBe('active');

    const history = await adapter.getBillingHistory('user_1');
    expect(history.length).toBe(1);
    expect(history[0].productName).toBe('pro_10');
    expect(history[0].paid).toBe(true);
  });

  it('cancels subscription gracefully', async () => {
    const onCancel = vi.fn();
    const adapter = createMemoryPolarAdapter({
      initialStatus: { plan: 'pro_10', subscriptionStatus: 'active' },
      onCancel,
    });

    const result = await adapter.cancelSubscription('too_expensive');
    expect(result.success).toBe(true);
    expect(onCancel).toHaveBeenCalledWith('too_expensive');

    const status = await adapter.getStatus('user_1');
    expect(status.subscriptionStatus).toBe('canceled');
  });
});
