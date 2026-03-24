import { createContext, useContext } from 'react';
import type {
  SubscriptionStatus,
  CheckoutParams,
  CancellationReason,
  CancelResult,
  SyncResult,
  OrderItem,
} from '../../domain/entities';

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

export function usePolarBilling(): PolarContextValue {
  const ctx = useContext(PolarContext);
  if (!ctx) throw new Error('usePolarBilling must be used within <PolarProvider>');
  return ctx;
}

export const useSubscription = usePolarBilling;
