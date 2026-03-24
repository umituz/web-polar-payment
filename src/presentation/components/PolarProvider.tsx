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

  // Store adapter and setters in refs to create stable callbacks
  const adapterRef = useRef(adapter);
  const statusRef = useRef({ setStatus, setLoading });
  const userIdRef = useRef(normalizeUserId(userId));
  const refreshAbortRef = useRef<AbortController | null>(null);

  // Keep refs in sync
  adapterRef.current = adapter;
  statusRef.current = { setStatus, setLoading };
  userIdRef.current = normalizeUserId(userId);

  // Stable refresh function with no dependencies - prevents cascading re-renders
  const refresh = useCallback(async () => {
    const uid = userIdRef.current;
    const { setStatus, setLoading } = statusRef.current;

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
  }, []); // No dependencies - completely stable

  useEffect(() => {
    refresh();
    return () => { refreshAbortRef.current?.abort(); };
  }, [refresh]); // Only re-run if refresh identity changes (never)

  const startCheckout = useCallback(async (params: CheckoutParams) => {
    const uid = userIdRef.current;
    const result = await adapterRef.current.createCheckout({ ...params, userId: uid ?? undefined });
    if (!result.url.startsWith('https://')) {
      throw new Error('[polar-billing] Invalid checkout URL returned: URL must start with https://');
    }
    window.location.href = result.url;
  }, []); // No dependencies - stable

  const syncSubscription = useCallback(async (): Promise<SyncResult> => {
    const uid = userIdRef.current;
    if (!uid) return { synced: false };

    const checkoutId = new URLSearchParams(window.location.search).get('checkout_id') ?? undefined;
    const result = await adapterRef.current.syncSubscription(uid, checkoutId);
    if (result.synced) await refresh();
    return result;
  }, [refresh]); // Only depends on stable refresh

  const getBillingHistory = useCallback(async (): Promise<OrderItem[]> => {
    const uid = userIdRef.current;
    if (!uid) return [];
    return adapterRef.current.getBillingHistory(uid);
  }, []); // No dependencies - stable

  const cancelSubscription = useCallback(
    async (reason?: CancellationReason): Promise<CancelResult> => {
      const result = await adapterRef.current.cancelSubscription(reason);
      if (result.success) await refresh();
      return result;
    },
    [refresh], // Only depends on stable refresh
  );

  const getPortalUrl = useCallback(async (): Promise<string> => {
    const uid = userIdRef.current;
    if (!uid) throw new Error('[polar-billing] Cannot get portal URL: No authenticated user');
    return adapterRef.current.getPortalUrl(uid);
  }, []); // No dependencies - stable

  // Memoized context value - only recreates when status/loading changes
  // All functions are stable, so they don't trigger re-creation
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
    [status, loading, refresh, syncSubscription], // startCheckout, getBillingHistory, cancelSubscription, getPortalUrl are stable
  );

  return <PolarContext.Provider value={value}>{children}</PolarContext.Provider>;
}
