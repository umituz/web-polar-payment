// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { useContext } from 'react';
import { PolarProvider } from '../../src/presentation/components/PolarProvider';
import { PolarContext, type PolarContextValue } from '../../src/presentation/context/polar-context';
import { NoopNavigationStrategy } from '../../src/presentation/navigation/navigation.strategy';
import type { PolarAdapter } from '../../src/domain/interfaces';
import { FREE_SUBSCRIPTION_STATUS } from '../../src/domain/entities/subscription.entity';

function stubAdapter(overrides?: Partial<PolarAdapter>): PolarAdapter {
  return {
    getStatus: vi.fn().mockResolvedValue(FREE_SUBSCRIPTION_STATUS),
    createCheckout: vi.fn().mockResolvedValue({ url: 'https://pay.test/1', id: 'co_1' }),
    syncSubscription: vi.fn().mockResolvedValue({ synced: false }),
    getBillingHistory: vi.fn().mockResolvedValue([]),
    cancelSubscription: vi.fn().mockResolvedValue({ success: false }),
    getPortalUrl: vi.fn().mockResolvedValue('https://portal.test'),
    ...overrides,
  };
}

/** Probe component that mirrors the context value for assertions. */
function ContextProbe({ onValue }: { onValue: (value: unknown) => void }) {
  const ctx = useContext(PolarContext);
  onValue(ctx);
  return null;
}

function probeRender(adapter: PolarAdapter, userId?: string) {
  let latest: unknown;
  const utils = render(
    <PolarProvider
      adapter={adapter}
      userId={userId}
      navigation={new NoopNavigationStrategy()}
    >
      <ContextProbe onValue={(v) => (latest = v)} />
    </PolarProvider>,
  );
  return {
    utils,
    value: () => latest as PolarContextValue,
  };
}

describe('PolarProvider', () => {
  it('exposes the free default while no user is set', async () => {
    const adapterImpl = stubAdapter();
    const { value } = probeRender(adapterImpl);

    await waitFor(() => expect(value().loading).toBe(false));
    expect(value().status.plan).toBe('free');
    expect(adapterImpl.getStatus).not.toHaveBeenCalled();
  });

  it('loads the status for the current user', async () => {
    const adapterImpl = stubAdapter({
      getStatus: vi.fn().mockResolvedValue({ plan: 'pro', subscriptionStatus: 'active' }),
    });
    const { value } = probeRender(adapterImpl, 'user_1');

    await waitFor(() => expect(value().status.plan).toBe('pro'));
    expect(adapterImpl.getStatus).toHaveBeenCalledWith('user_1');
    expect(value().loading).toBe(false);
  });

  it('reloads when the user changes', async () => {
    const getStatus = vi
      .fn()
      .mockResolvedValueOnce({ plan: 'pro', subscriptionStatus: 'active' })
      .mockResolvedValueOnce({ plan: 'premium', subscriptionStatus: 'active' });
    const adapterImpl = stubAdapter({ getStatus });

    const { utils, value } = probeRender(adapterImpl, 'user_1');
    await waitFor(() => expect(value().status.plan).toBe('pro'));

    let latest: unknown;
    utils.rerender(
      <PolarProvider
        adapter={adapterImpl}
        userId="user_2"
        navigation={new NoopNavigationStrategy()}
      >
        <ContextProbe onValue={(v) => (latest = v)} />
      </PolarProvider>,
    );
    const rerendered = () => latest as PolarContextValue;

    await waitFor(() => expect(rerendered().status.plan).toBe('premium'));
    expect(getStatus).toHaveBeenLastCalledWith('user_2');
  });

  it('falls back to the free status when loading fails', async () => {
    const adapterImpl = stubAdapter({ getStatus: vi.fn().mockRejectedValue(new Error('offline')) });
    const { value } = probeRender(adapterImpl, 'user_1');

    await waitFor(() => expect(value().loading).toBe(false));
    expect(value().status.plan).toBe('free');
    expect(value().status.subscriptionStatus).toBe('none');
  });

  it('a slow earlier refresh can never overwrite a newer one', async () => {
    // Regression: without a generation guard, the slow first response
    // resolves last and clobbers the fresh second refresh.
    const getStatus = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ plan: 'slow', subscriptionStatus: 'active' }), 120)),
      )
      .mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ plan: 'fast', subscriptionStatus: 'active' }), 10)),
      );
    const adapterImpl = stubAdapter({ getStatus });
    const { value } = probeRender(adapterImpl, 'user_1');

    await waitFor(() => expect(value().status.plan).toBe('slow'));

    await act(async () => {
      await value().refresh();
    });
    expect(value().status.plan).toBe('fast');

    // Wait past the slow resolution — it must NOT overwrite 'fast'.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    expect(value().status.plan).toBe('fast');
  });

  it('syncSubscription refreshes the status when synced', async () => {
    const getStatus = vi
      .fn()
      .mockResolvedValueOnce({ plan: 'free', subscriptionStatus: 'none' })
      .mockResolvedValue({ plan: 'pro', subscriptionStatus: 'active' });
    const adapterImpl = stubAdapter({
      getStatus,
      syncSubscription: vi.fn().mockResolvedValue({ synced: true, plan: 'pro' }),
    });
    const { value } = probeRender(adapterImpl, 'user_1');

    await waitFor(() => expect(value().status.plan).toBe('free'));

    let result: { synced: boolean } | undefined;
    await act(async () => {
      result = await value().syncSubscription();
    });

    expect(result).toBeDefined();
    expect(result?.synced).toBe(true);
    await waitFor(() => expect(value().status.plan).toBe('pro'));
  });

  it('cancelSubscription refreshes the status on success', async () => {
    const getStatus = vi
      .fn()
      .mockResolvedValueOnce({ plan: 'pro', subscriptionStatus: 'active' })
      .mockResolvedValueOnce({ plan: 'pro', subscriptionStatus: 'canceled' });
    const adapterImpl = stubAdapter({
      getStatus,
      cancelSubscription: vi.fn().mockResolvedValue({ success: true }),
    });
    const { value } = probeRender(adapterImpl, 'user_1');

    await waitFor(() => expect(value().status.plan).toBe('pro'));

    await act(async () => {
      await value().cancelSubscription('unused');
    });

    expect(adapterImpl.cancelSubscription).toHaveBeenCalledWith('unused');
    await waitFor(() => expect(value().status.subscriptionStatus).toBe('canceled'));
  });

  it('startCheckout validates the productId before calling the adapter', async () => {
    const adapterImpl = stubAdapter();
    const { value } = probeRender(adapterImpl, 'user_1');
    await waitFor(() => expect(value().loading).toBe(false));

    await expect(value().startCheckout({ productId: '' })).rejects.toThrow(/Invalid productId/i);
    expect(adapterImpl.createCheckout).not.toHaveBeenCalled();
  });

  it('startCheckout rejects insecure non-loopback checkout URLs', async () => {
    const adapterImpl = stubAdapter({
      createCheckout: vi.fn().mockResolvedValue({ url: 'http://evil.test/pay', id: 'co' }),
    });
    const { value } = probeRender(adapterImpl, 'user_1');
    await waitFor(() => expect(value().loading).toBe(false));

    await expect(value().startCheckout({ productId: 'p' })).rejects.toThrow(/[Ii]nsecure/);
  });

  it('startCheckout rejects without an authenticated user', async () => {
    const { value } = probeRender(stubAdapter());
    await waitFor(() => expect(value().loading).toBe(false));

    await expect(value().startCheckout({ productId: 'p' })).rejects.toThrow(/no authenticated user/i);
  });
});
