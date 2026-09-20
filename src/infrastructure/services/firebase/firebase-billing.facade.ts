/**
 * FirebaseBillingFacade — Facade pattern.
 *
 * Composes the focused repositories (subscription, checkout, billing, sync,
 * cancellation, portal) into a single `PolarAdapter`. The React provider
 * and any consumer code see one object with the SDK contract — they never
 * know that six repositories live behind it.
 *
 * Each public method is a one-line delegation; cross-cutting concerns
 * (e.g. "refresh after mutation") belong in the *provider*, not here.
 */

import type {
  CancelResult,
  CancellationReason,
  CheckoutParams,
  CheckoutResult,
  OrderItem,
  SyncResult,
} from '../../../domain/entities';
import type { SubscriptionStatus } from '../../../domain/entities/subscription.entity';
import type { PolarAdapter } from '../../../domain/interfaces';
import type { BillingRepository } from './billing.repository';
import type { CancellationRepository } from './cancellation.repository';
import type { CheckoutRepository } from './checkout.repository';
import type { PortalRepository } from './portal.repository';
import type { SubscriptionRepository } from './subscription.repository';
import type { SyncRepository } from './sync.repository';

export class FirebaseBillingFacade implements PolarAdapter {
  constructor(
    private readonly subscription: SubscriptionRepository,
    private readonly checkout: CheckoutRepository,
    private readonly billing: BillingRepository,
    private readonly sync: SyncRepository,
    private readonly cancellation: CancellationRepository,
    private readonly portal: PortalRepository,
  ) {}

  getStatus(userId: string): Promise<SubscriptionStatus> {
    return this.subscription.getStatus(userId);
  }

  createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    return this.checkout.create(params);
  }

  syncSubscription(userId: string, checkoutId?: string): Promise<SyncResult> {
    return this.sync.sync(userId, checkoutId);
  }

  getBillingHistory(userId: string): Promise<OrderItem[]> {
    return this.billing.getHistory(userId);
  }

  cancelSubscription(reason?: CancellationReason): Promise<CancelResult> {
    return this.cancellation.cancel(reason);
  }

  getPortalUrl(userId: string): Promise<string> {
    return this.portal.getUrl(userId);
  }
}
