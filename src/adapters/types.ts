import type {
  SubscriptionStatus,
  CheckoutParams,
  CheckoutResult,
  OrderItem,
  CancellationReason,
  CancelResult,
  SyncResult,
} from '../core/types';

/**
 * Backend-agnostic interface every adapter must implement.
 * All adapters receive checkoutId from the context layer (never read from window.location).
 */
export interface PolarAdapter {
  getStatus(userId: string): Promise<SubscriptionStatus>;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  /** checkoutId is read from URL by the context and passed explicitly */
  syncSubscription(userId: string, checkoutId?: string): Promise<SyncResult>;
  getBillingHistory(userId: string): Promise<OrderItem[]>;
  cancelSubscription(reason?: CancellationReason): Promise<CancelResult>;
  getPortalUrl(userId: string): Promise<string>;
}
