import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import type { PolarAdapter } from '../adapters/types';
import type {
  SubscriptionStatus,
  CheckoutParams,
  CancellationReason,
  CancelResult,
  SyncResult,
  OrderItem,
} from '../core/types';

// ─── Context ──────────────────────────────────────────────────────────────────

interface PolarContextValue {
  status: SubscriptionStatus;
  loading: boolean;
  refresh: () => Promise<void>;
  startCheckout: (params: CheckoutParams) => Promise<void>;
  syncSubscription: () => Promise<SyncResult>;
  getBillingHistory: () => Promise<OrderItem[]>;
  cancelSubscription: (reason?: CancellationReason) => Promise<CancelResult>;
  getPortalUrl: () => Promise<string>;
}

const PolarContext = createContext<PolarContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface PolarProviderProps {
  adapter: PolarAdapter;
  userId?: string;
  children: ReactNode;
}

const FREE_STATUS: SubscriptionStatus = {
  plan: 'free',
  subscriptionStatus: 'none',
};

export function PolarProvider({ adapter, userId, children }: PolarProviderProps) {
  const [status, setStatus] = useState<SubscriptionStatus>(FREE_STATUS);
  const [loading, setLoading] = useState(true);
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;
  // Track in-flight refresh to avoid race conditions on fast userId changes
  const refreshAbortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    // Skip empty / whitespace-only userId
    const uid = userId?.trim();
    if (!uid) {
      setStatus(FREE_STATUS);
      setLoading(false);
      return;
    }

    // Cancel any previous in-flight refresh
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
    const result = await adapterRef.current.createCheckout({ ...params, userId: userId?.trim() });
    // Validate URL before redirecting to prevent open-redirect attacks
    if (!result.url.startsWith('https://')) {
      throw new Error('Invalid checkout URL returned');
    }
    window.location.href = result.url;
  }, [userId]);

  const syncSubscription = useCallback(async (): Promise<SyncResult> => {
    const uid = userId?.trim();
    if (!uid) return { synced: false };

    // Context reads checkoutId from URL — never from inside the adapter
    const checkoutId = new URLSearchParams(window.location.search).get('checkout_id') ?? undefined;
    const result = await adapterRef.current.syncSubscription(uid, checkoutId);
    if (result.synced) await refresh();
    return result;
  }, [userId, refresh]);

  const getBillingHistory = useCallback(async (): Promise<OrderItem[]> => {
    const uid = userId?.trim();
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
    const uid = userId?.trim();
    if (!uid) throw new Error('No authenticated user');
    return adapterRef.current.getPortalUrl(uid);
  }, [userId]);

  const value = useMemo<PolarContextValue>(
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

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePolarBilling(): PolarContextValue {
  const ctx = useContext(PolarContext);
  if (!ctx) throw new Error('usePolarBilling must be used within <PolarProvider>');
  return ctx;
}

export const useSubscription = usePolarBilling;
