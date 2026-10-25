import type {
  SubscriptionStatus,
  CheckoutParams,
  CheckoutResult,
  OrderItem,
  CancellationReason,
  CancelResult,
  SyncResult,
} from '../entities';

/**
 * PolarAdapter — the single SDK-facing interface.
 *
 * Implementations (REST, custom, mock, etc.) translate platform-specific
 * calls into the contract below. The rest of the SDK depends only on this
 * interface (Dependency Inversion).
 */
export interface PolarAdapter {
  getStatus(userId: string): Promise<SubscriptionStatus>;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  syncSubscription(userId: string, checkoutId?: string): Promise<SyncResult>;
  getBillingHistory(userId: string): Promise<OrderItem[]>;
  cancelSubscription(reason?: CancellationReason): Promise<CancelResult>;
  getPortalUrl(userId: string): Promise<string>;
}
