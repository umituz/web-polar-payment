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
import { normalizeUserId, isValidProductId, isValidCheckoutUrl, isProductionInsecureUrl } from '../../infrastructure/utils/validations.util';

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
  const statusRef = useRef({ setStatus, setLoading });
  const userIdRef = useRef(normalizeUserId(userId));
  const refreshMountedRef = useRef(true);

  adapterRef.current = adapter;
  statusRef.current = { setStatus, setLoading };
  userIdRef.current = normalizeUserId(userId);

  const refresh = useCallback(async () => {
    const uid = userIdRef.current;
    const { setStatus, setLoading } = statusRef.current;

    if (!uid) {
      setStatus(FREE_STATUS);
      setLoading(false);
      return;
    }

    refreshMountedRef.current = true;

    try {
      setLoading(true);
      const s = await adapterRef.current.getStatus(uid);
      if (refreshMountedRef.current) setStatus(s);
    } catch (err) {
      if (refreshMountedRef.current) {
        setStatus(FREE_STATUS);
      }
    } finally {
      if (refreshMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMountedRef.current = true;
    refresh();
    return () => { refreshMountedRef.current = false; };
  }, [userId]);

  const startCheckout = useCallback(async (params: CheckoutParams) => {
    if (!isValidProductId(params.productId)) {
      throw new Error('[polar-billing] Invalid productId: must be a non-empty string');
    }

    const uid = userIdRef.current;
    if (!uid) {
      throw new Error('[polar-billing] Cannot start checkout: No authenticated user');
    }

    try {
      const result = await adapterRef.current.createCheckout({ ...params, userId: uid });

      if (!isValidCheckoutUrl(result.url)) {
        throw new Error('[polar-billing] Invalid checkout URL returned: URL must start with https:// or http://');
      }

      if (isProductionInsecureUrl(result.url)) {
        throw new Error('[polar-billing] ERROR: Using insecure http:// URL in production environment');
      }

      // Navigate to checkout URL
      window.location.href = result.url;
    } catch (error) {
      // Re-throw with additional context
      if (error instanceof Error) {
        throw new Error(`[polar-billing] Checkout failed: ${error.message}`);
      }
      throw error;
    }
  }, []);

  const syncSubscription = useCallback(async (): Promise<SyncResult> => {
    const uid = userIdRef.current;
    if (!uid) return { synced: false };

    const checkoutId = new URLSearchParams(window.location.search).get('checkout_id') ?? undefined;
    const result = await adapterRef.current.syncSubscription(uid, checkoutId);
    if (result.synced) await refresh();
    return result;
  }, [refresh]);

  const getBillingHistory = useCallback(async (): Promise<OrderItem[]> => {
    const uid = userIdRef.current;
    if (!uid) return [];
    return adapterRef.current.getBillingHistory(uid);
  }, []);

  const cancelSubscription = useCallback(
    async (reason?: CancellationReason): Promise<CancelResult> => {
      const result = await adapterRef.current.cancelSubscription(reason);
      if (result.success) await refresh();
      return result;
    },
    [refresh],
  );

  const getPortalUrl = useCallback(async (): Promise<string> => {
    const uid = userIdRef.current;
    if (!uid) throw new Error('[polar-billing] Cannot get portal URL: No authenticated user');
    return adapterRef.current.getPortalUrl(uid);
  }, []);

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
    [status, loading, refresh, syncSubscription],
  );

  return <PolarContext.Provider value={value}>{children}</PolarContext.Provider>;
}
