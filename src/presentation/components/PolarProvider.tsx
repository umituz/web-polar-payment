/**
 * PolarProvider — owns the SDK lifecycle and exposes the context value.
 *
 * Responsibilities (single):
 *   - Track current `userId` and trigger a refresh on change
 *   - Expose checkout / sync / cancel / portal helpers
 *   - Forward a navigation strategy so `startCheckout` can redirect
 *
 * Non-responsibilities:
 *   - The provider knows only the `PolarAdapter` contract — never a
 *     concrete transport implementation.
 *   - Cross-cutting concerns (e.g. "redirect URL validation") are split
 *     into `security.util`.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { PolarAdapter } from '../../domain/interfaces';
import type {
  CancellationReason,
  CancelResult,
  CheckoutParams,
  OrderItem,
  SubscriptionStatus,
  SyncResult,
} from '../../domain/entities';
import { FREE_SUBSCRIPTION_STATUS } from '../../domain/entities/subscription.entity';
import {
  isProductionInsecureUrl,
  isValidCheckoutUrl,
} from '../../infrastructure/utils/security.util';
import { isValidProductId } from '../../infrastructure/utils/validation.util';
import { normalizeUserId } from '../../infrastructure/utils/validation.util';
import {
  NoopNavigationStrategy,
  type NavigationStrategy,
} from '../navigation/navigation.strategy';
import { PolarContext, type PolarContextValue } from '../context/polar-context';

export interface PolarProviderProps {
  adapter: PolarAdapter;
  userId?: string;
  /**
   * Strategy used to redirect the browser to the checkout URL. Defaults to
   * `NoopNavigationStrategy` in environments without `window`, and to
   * `window.location` in the browser.
   */
  navigation?: NavigationStrategy;
  children: ReactNode;
}

function defaultNavigation(): NavigationStrategy {
  if (typeof window === 'undefined') return new NoopNavigationStrategy();
  return {
    redirect(url: string): void {
      window.location.href = url;
    },
  };
}

export function PolarProvider({
  adapter,
  userId,
  navigation,
  children,
}: PolarProviderProps) {
  const [status, setStatus] = useState<SubscriptionStatus>(FREE_SUBSCRIPTION_STATUS);
  const [loading, setLoading] = useState(true);

  const adapterRef = useRef(adapter);
  const userIdRef = useRef(normalizeUserId(userId));
  const navigationRef = useRef<NavigationStrategy>(navigation ?? defaultNavigation());
  // Monotonic token: only the most recent refresh may commit state, so a
  // slow earlier response can never overwrite a newer one.
  const refreshGenerationRef = useRef(0);

  adapterRef.current = adapter;
  userIdRef.current = normalizeUserId(userId);
  navigationRef.current = navigation ?? navigationRef.current;

  const refresh = useCallback(async (): Promise<void> => {
    const generation = ++refreshGenerationRef.current;
    const uid = userIdRef.current;
    if (!uid) {
      setStatus(FREE_SUBSCRIPTION_STATUS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const next = await adapterRef.current.getStatus(uid);
      if (generation !== refreshGenerationRef.current) return;
      setStatus(next);
    } catch {
      // Surface as a free plan — the UI can show a "couldn't load" banner
      // derived from `status`; the SDK should not crash on transient errors.
      if (generation !== refreshGenerationRef.current) return;
      setStatus(FREE_SUBSCRIPTION_STATUS);
    } finally {
      if (generation === refreshGenerationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [userId, refresh]);

  const startCheckout = useCallback(async (params: CheckoutParams): Promise<void> => {
    if (!isValidProductId(params.productId)) {
      throw new Error('[polar-billing] Invalid productId: must be a non-empty string');
    }
    const uid = userIdRef.current;
    if (!uid) {
      throw new Error('[polar-billing] Cannot start checkout: no authenticated user');
    }

    const result = await adapterRef.current.createCheckout({ ...params, userId: uid });
    if (!isValidCheckoutUrl(result.url)) {
      throw new Error('[polar-billing] Invalid checkout URL: must start with https:// or http://');
    }
    if (isProductionInsecureUrl(result.url)) {
      throw new Error('[polar-billing] Insecure http:// checkout URL in production');
    }

    navigationRef.current.redirect(result.url);
  }, []);

  const syncSubscription = useCallback(async (): Promise<SyncResult> => {
    const uid = userIdRef.current;
    if (!uid) return { synced: false };

    const checkoutId =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('checkout_id') ?? undefined
        : undefined;

    const result = await adapterRef.current.syncSubscription(uid, checkoutId);
    if (result.synced) {
      await refresh();
    }
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
      if (result.success) {
        await refresh();
      }
      return result;
    },
    [refresh],
  );

  const getPortalUrl = useCallback(async (): Promise<string> => {
    const uid = userIdRef.current;
    if (!uid) {
      throw new Error('[polar-billing] Cannot get portal URL: no authenticated user');
    }
    return adapterRef.current.getPortalUrl(uid);
  }, []);

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
    [
      status,
      loading,
      refresh,
      startCheckout,
      syncSubscription,
      getBillingHistory,
      cancelSubscription,
      getPortalUrl,
    ],
  );

  return <PolarContext.Provider value={value}>{children}</PolarContext.Provider>;
}
