import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import type { PolarAdapter } from '../../domain/interfaces';
import type {
  SubscriptionStatus,
  CheckoutParams,
  CancellationReason,
  CancelResult,
  SyncResult,
  OrderItem,
} from '../../domain/entities';
import { PolarContext } from '../hooks/usePolarBilling';

/**
 * PolarProvider Component
 * @description Context provider for Polar billing management.
 */

interface PolarProviderProps {
  adapter: PolarAdapter;
  userId?: string;
  children: ReactNode;
}

const FREE_STATUS: SubscriptionStatus = {
  plan: 'free',
  subscriptionStatus: 'none',
};

function normalizeUserId(userId: string | undefined): string | undefined {
  if (typeof userId !== 'string') return undefined;
  const trimmed = userId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function PolarProvider({ adapter, userId, children }: PolarProviderProps) {
  const [status, setStatus] = useState<SubscriptionStatus>(FREE_STATUS);
  const [loading, setLoading] = useState(true);
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;
  const refreshAbortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const uid = normalizeUserId(userId);
    if (!uid) {
      setStatus(FREE_STATUS);
      setLoading(false);
      return;
    }

    refreshAbortRef.current?.abort();
    const ctrl = new AbortController();
    refreshAbortRef.current = ctrl;

    try {
      setLoading(true);
      const s = await adapterRef.current.getStatus(uid);
      if (!ctrl.signal.aborted) setStatus(s);
    } catch (err) {
      if (!ctrl.signal.aborted) {
        console.error('[polar-billing] getStatus failed:', err);
        setStatus(FREE_STATUS);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    return () => { refreshAbortRef.current?.abort(); };
  }, [refresh]);

  const startCheckout = useCallback(async (params: CheckoutParams) => {
    const uid = normalizeUserId(userId);
    const result = await adapterRef.current.createCheckout({ ...params, userId: uid });
    if (!result.url.startsWith('https://')) {
      throw new Error('[polar-billing] Invalid checkout URL returned: URL must start with https://');
    }
    window.location.href = result.url;
  }, [userId]);

  const syncSubscription = useCallback(async (): Promise<SyncResult> => {
    const uid = normalizeUserId(userId);
    if (!uid) return { synced: false };

    const checkoutId = new URLSearchParams(window.location.search).get('checkout_id') ?? undefined;
    const result = await adapterRef.current.syncSubscription(uid, checkoutId);
    if (result.synced) await refresh();
    return result;
  }, [userId, refresh]);

  const getBillingHistory = useCallback(async (): Promise<OrderItem[]> => {
    const uid = normalizeUserId(userId);
    if (!uid) return [];
    return adapterRef.current.getBillingHistory(uid);
  }, [userId]);

  const cancelSubscription = useCallback(
    async (reason?: CancellationReason): Promise<CancelResult> => {
      const result = await adapterRef.current.cancelSubscription(reason);
      if (result.success) await refresh();
      return result;
    },
    [refresh],
  );

  const getPortalUrl = useCallback(async (): Promise<string> => {
    const uid = normalizeUserId(userId);
    if (!uid) throw new Error('[polar-billing] Cannot get portal URL: No authenticated user');
    return adapterRef.current.getPortalUrl(uid);
  }, [userId]);

  const value = useMemo(
    () => ({
      status,
      loading,
      refresh,
      startCheckout,
      syncSubscription,
      getBillingHistory,
      cancelSubscription,
      getPortalUrl,
    }),
    [status, loading, refresh, startCheckout, syncSubscription, getBillingHistory, cancelSubscription, getPortalUrl],
  );

  return <PolarContext.Provider value={value}>{children}</PolarContext.Provider>;
}
