import { describe, it, expect, vi, beforeEach } from 'vitest';

// The adapter lazy-imports the modular Firebase SDK; mock both surfaces so
// the whole suite runs without a Firebase project.
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn() }));

import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import {
  createFirebaseAdapter,
  type FirebaseAdapterConfig,
} from '../../src/infrastructure/services/firebase/create-firebase-adapter';
import { FirebaseBillingError } from '../../src/infrastructure/errors/firebase-billing.error';

const mockedHttpsCallable = vi.mocked(httpsCallable);
const mockedDoc = vi.mocked(doc);
const mockedGetDoc = vi.mocked(getDoc);

const functions = { name: 'functions-instance' } as unknown;
const firestore = { name: 'firestore-instance' } as unknown;

function adapter(overrides?: Partial<FirebaseAdapterConfig>) {
  return createFirebaseAdapter({ functions, firestore, ...overrides });
}

/** Script a callable: name -> response or thrown value. */
function scriptCallable(
  implementations: Record<string, (data: unknown) => unknown>,
): { calls: Array<{ name: string; data: unknown }> } {
  const calls: Array<{ name: string; data: unknown }> = [];
  mockedHttpsCallable.mockImplementation(((
    _functions: unknown,
    name: string,
  ) => async (data?: unknown) => {
    calls.push({ name, data });
    const impl = implementations[name];
    if (!impl) throw new Error(`unscripted callable: ${name}`);
    return { data: impl(data) };
  }) as unknown as typeof httpsCallable);
  return { calls };
}

beforeEach(() => {
  mockedHttpsCallable.mockReset();
  mockedDoc.mockReset().mockReturnValue({ path: 'users/user' } as never);
  mockedGetDoc.mockReset();
});

describe('createFirebaseAdapter', () => {
  it('returns a PolarAdapter with the full contract', () => {
    const impl = adapter();
    for (const method of [
      'getStatus',
      'createCheckout',
      'syncSubscription',
      'getBillingHistory',
      'cancelSubscription',
      'getPortalUrl',
    ] as const) {
      expect(typeof impl[method]).toBe('function');
    }
  });
});

describe('getStatus', () => {
  it('reads the user document from the configured collection', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({ plan: 'pro', subscriptionStatus: 'active' }),
    } as never);

    await adapter().getStatus('user_1');

    expect(mockedDoc).toHaveBeenCalledWith(firestore, 'users', 'user_1');
    expect(mockedGetDoc).toHaveBeenCalledTimes(1);
  });

  it('returns the free default when the document is missing', async () => {
    mockedGetDoc.mockResolvedValue({ exists: false, data: () => undefined } as never);

    const status = await adapter().getStatus('user_1');

    expect(status.plan).toBe('free');
    expect(status.subscriptionStatus).toBe('none');
  });

  it('maps raw fields onto the domain shape', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({
        plan: 'pro',
        subscriptionStatus: 'active',
        billingCycle: 'year',
        subscriptionId: 'sub_9',
        polarCustomerId: 'pc_1',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { toDate: () => new Date('2026-12-31T00:00:00Z') }, // Timestamp
      }),
    } as never);

    const status = await adapter().getStatus('user_1');

    expect(status).toEqual({
      plan: 'pro',
      subscriptionStatus: 'active',
      billingCycle: 'yearly', // legacy alias normalized
      subscriptionId: 'sub_9',
      polarCustomerId: 'pc_1',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: '2026-12-31T00:00:00.000Z',
    });
  });

  it('supports custom field names', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({ tier: 'pro', sub_state: 'active' }),
    } as never);

    const status = adapter({
      firestorePaths: { PLAN_FIELD: 'tier', SUBSCRIPTION_STATUS_FIELD: 'sub_state' },
    });
    const result = await status.getStatus('user_1');

    expect(result.plan).toBe('pro');
    expect(result.subscriptionStatus).toBe('active');
  });

  it('normalizes unknown statuses to none', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: true,
      data: () => ({ plan: 'pro', subscriptionStatus: 'garbage' }),
    } as never);

    const result = await adapter().getStatus('user_1');
    expect(result.subscriptionStatus).toBe('none');
  });

  it('rejects empty user ids with invalid-argument', async () => {
    const error = await adapter().getStatus('').catch((e) => e);
    expect(error).toBeInstanceOf(FirebaseBillingError);
    expect(error.code).toBe('invalid-argument');
  });

  it('wraps transport failures as status-load-failed', async () => {
    mockedGetDoc.mockRejectedValue(new Error('network down'));

    const error = await adapter().getStatus('user_1').catch((e) => e);
    expect(error.code).toBe('status-load-failed');
    expect(error.originalError).toBeInstanceOf(Error);
  });

  it('tolerates method-shaped snapshot.exists (firebase 12 types)', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ plan: 'pro', subscriptionStatus: 'active' }),
    } as never);

    const status = await adapter().getStatus('user_1');
    expect(status.plan).toBe('pro');
  });
});

describe('createCheckout', () => {
  it('rejects invalid product ids before touching the callable', async () => {
    const { calls } = scriptCallable({});
    const error = await adapter().createCheckout({ productId: '  ' }).catch((e) => e);

    expect(error.code).toBe('invalid-argument');
    expect(calls).toHaveLength(0);
  });

  it('calls the configured callable with the params', async () => {
    const { calls } = scriptCallable({
      createCheckoutSession: () => ({ url: 'https://pay.polar.test/xyz', id: 'co_1' }),
    });

    const result = await adapter().createCheckout({ productId: 'prod_1', billingCycle: 'monthly' });

    expect(result).toEqual({ url: 'https://pay.polar.test/xyz', id: 'co_1' });
    expect(calls[0]).toEqual({
      name: 'createCheckoutSession',
      data: { productId: 'prod_1', billingCycle: 'monthly' },
    });
  });

  it('supports custom callable names', async () => {
    const { calls } = scriptCallable({ myCheckout: () => ({ url: 'https://x.test', id: 'co' }) });

    await adapter({ callables: { CREATE_CHECKOUT: 'myCheckout' } }).createCheckout({
      productId: 'p',
    });

    expect(calls[0]?.name).toBe('myCheckout');
  });

  it('wraps callable failures as checkout-failed', async () => {
    mockedHttpsCallable.mockImplementation(((
      _f: unknown,
      name: string,
    ) => async () => {
      throw { code: 'functions/internal', message: `${name} exploded` };
    }) as unknown as typeof httpsCallable);

    const error = await adapter().createCheckout({ productId: 'p' }).catch((e) => e);
    expect(error).toBeInstanceOf(FirebaseBillingError);
    expect(error.code).toBe('checkout-failed');
  });
});

describe('CallableClient error mapping', () => {
  it('uses the operation code and preserves the Firebase error as cause', async () => {
    mockedHttpsCallable.mockImplementation(((
      _f: unknown,
      _name: string,
    ) => async () => {
      throw { code: 'functions/unauthenticated', message: 'no auth' };
    }) as unknown as typeof httpsCallable);

    const error = await adapter().syncSubscription('u1').catch((e) => e);

    expect(error).toBeInstanceOf(FirebaseBillingError);
    expect(error.message).toBe('no auth');
    expect(error.code).toBe('sync-failed'); // stable operation code
    expect((error.originalError as { code?: string }).code).toBe('functions/unauthenticated');
  });

  it('maps non-object throwables to the operation code', async () => {
    mockedHttpsCallable.mockImplementation(((
      _f: unknown,
      _name: string,
    ) => async () => {
      throw 'a string failure';
    }) as unknown as typeof httpsCallable);

    const error = await adapter().cancelSubscription().catch((e) => e);
    expect(error).toBeInstanceOf(FirebaseBillingError);
    expect(error.code).toBe('cancel-failed');
  });
});

describe('getBillingHistory', () => {
  it('returns the orders from the callable', async () => {
    const orders = [{ id: 'o1', createdAt: '2026-01-01', amount: 1999, currency: 'USD', status: 'paid', paid: true, productName: 'Pro' }];
    scriptCallable({ getBillingHistory: () => ({ orders }) });

    const result = await adapter().getBillingHistory('user_1');

    expect(result).toEqual(orders);
  });

  it('returns [] for malformed responses', async () => {
    scriptCallable({ getBillingHistory: () => ({ unexpected: true }) });
    expect(await adapter().getBillingHistory('user_1')).toEqual([]);
  });

  it('recovers from failures with [] and reports to the default logger', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedHttpsCallable.mockImplementation(((
      _f: unknown,
      _name: string,
    ) => async () => {
      throw new Error('offline');
    }) as unknown as typeof httpsCallable);

    const result = await adapter().getBillingHistory('user_1');

    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalled();
    vi.mocked(console.error).mockRestore();
  });

  it('routes recovered failures to a custom logger', async () => {
    const logger = vi.fn();
    mockedHttpsCallable.mockImplementation(((
      _f: unknown,
      _name: string,
    ) => async () => {
      throw new Error('offline');
    }) as unknown as typeof httpsCallable);

    const result = await adapter({ logger }).getBillingHistory('user_1');

    expect(result).toEqual([]);
    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger.mock.calls[0]?.[0]).toBeInstanceOf(FirebaseBillingError);
  });
});

describe('cancelSubscription', () => {
  it('sends the reason and returns the result', async () => {
    const { calls } = scriptCallable({
      cancelSubscription: () => ({ success: true, endsAt: '2026-12-31' }),
    });

    const result = await adapter().cancelSubscription('too_expensive');

    expect(result).toEqual({ success: true, endsAt: '2026-12-31' });
    expect(calls[0]?.data).toEqual({ reason: 'too_expensive' });
  });

  it('wraps failures as cancel-failed', async () => {
    mockedHttpsCallable.mockImplementation(((
      _f: unknown,
      _name: string,
    ) => async () => {
      throw new Error('boom');
    }) as unknown as typeof httpsCallable);

    const error = await adapter().cancelSubscription().catch((e) => e);
    expect(error.code).toBe('cancel-failed');
  });
});

describe('getPortalUrl', () => {
  it('returns a validated URL', async () => {
    scriptCallable({ getCustomerPortalUrl: () => ({ url: 'https://portal.polar.test/u' }) });

    const url = await adapter().getPortalUrl('user_1');

    expect(url).toBe('https://portal.polar.test/u');
  });

  it('rejects empty URLs as invalid-response', async () => {
    scriptCallable({ getCustomerPortalUrl: () => ({ url: '' }) });

    const error = await adapter().getPortalUrl('user_1').catch((e) => e);
    expect(error.code).toBe('invalid-response');
  });

  it('rejects non-string URLs as invalid-response', async () => {
    scriptCallable({ getCustomerPortalUrl: () => ({ url: 42 }) });

    const error = await adapter().getPortalUrl('user_1').catch((e) => e);
    expect(error.code).toBe('invalid-response');
  });
});

describe('syncSubscription', () => {
  it('forwards userId and checkoutId', async () => {
    const { calls } = scriptCallable({
      syncSubscription: () => ({ synced: true, plan: 'pro' }),
    });

    const result = await adapter().syncSubscription('user_1', 'ck_abc');

    expect(result).toEqual({ synced: true, plan: 'pro' });
    expect(calls[0]?.data).toEqual({ userId: 'user_1', checkoutId: 'ck_abc' });
  });

  it('wraps failures as sync-failed', async () => {
    mockedHttpsCallable.mockImplementation(((
      _f: unknown,
      _name: string,
    ) => async () => {
      throw new Error('nope');
    }) as unknown as typeof httpsCallable);

    const error = await adapter().syncSubscription('user_1').catch((e) => e);
    expect(error.code).toBe('sync-failed');
  });
});
