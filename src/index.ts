// Core types & utilities
export type {
  SubscriptionStatus,
  SubscriptionStatusValue,
  BillingCycle,
  OrderItem,
  CheckoutParams,
  CheckoutResult,
  CancellationReason,
  CancelResult,
  SyncResult,
} from './core/types';

export {
  SUBSCRIPTION_STATUS,
  FREE_PLAN,
  normalizeStatus,
  normalizeBillingCycle,
} from './core/constants';

// Adapter interface + factory functions
export type { PolarAdapter } from './adapters/types';
export { createSupabaseAdapter } from './adapters/supabase';
export type { SupabaseAdapterConfig } from './adapters/supabase';
export { createFirebaseAdapter } from './adapters/firebase';
export type { FirebaseAdapterConfig } from './adapters/firebase';

// React
export { PolarProvider, usePolarBilling, useSubscription } from './react/context';
