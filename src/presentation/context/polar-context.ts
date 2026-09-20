import { createContext, useContext } from 'react';
import type {
  SubscriptionStatus,
  CheckoutParams,
  CancellationReason,
  CancelResult,
  SyncResult,
  OrderItem,
} from '../../domain/entities';

/**
 * The single value exposed by `PolarProvider` to consumers. Adding a method
 * here is a contract change — keep the surface minimal.
 */
export interface PolarContextValue {
  status: SubscriptionStatus;
  loading: boolean;
  refresh: () => Promise<void>;
  startCheckout: (params: CheckoutParams) => Promise<void>;
  syncSubscription: () => Promise<SyncResult>;
  getBillingHistory: () => Promise<OrderItem[]>;
  cancelSubscription: (reason?: CancellationReason) => Promise<CancelResult>;
  getPortalUrl: () => Promise<string>;
}

export const PolarContext = createContext<PolarContextValue | undefined>(undefined);

/**
 * Hook-style access to the polar context. Throws when used outside a
 * `PolarProvider` so the failure mode is explicit and immediate.
 */
export function usePolarBilling(): PolarContextValue {
  const ctx = useContext(PolarContext);
  if (!ctx) {
    throw new Error('usePolarBilling must be used within <PolarProvider>');
  }
  return ctx;
}
