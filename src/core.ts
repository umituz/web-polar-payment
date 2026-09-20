/**
 * `@umituz/web-polar-payment/core` — framework-agnostic, backend-agnostic.
 *
 * Domain types, enums, guards, and the `PolarAdapter` contract. This entry
 * has zero runtime dependencies: no React, no Firebase, no fetch. Any
 * SaaS — web, mobile, server — can build an adapter against this contract.
 */

/* ----- Subscription status ----- */
export {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_STATUS_VALUES,
  isKnownSubscriptionStatus,
} from './domain/enums/subscription-status.enum';
export type { SubscriptionStatusValue } from './domain/enums/subscription-status.enum';

/* ----- Billing cycle ----- */
export {
  BILLING_CYCLE,
  BILLING_CYCLE_VALUES,
  isKnownBillingCycle,
  parseBillingCycle,
} from './domain/enums/billing-cycle.enum';
export type { BillingCycle } from './domain/enums/billing-cycle.enum';

/* ----- Amount type ----- */
export { POLAR_AMOUNT_TYPE } from './domain/enums/amount-type.enum';
export type { PolarAmountType } from './domain/enums/amount-type.enum';

/* ----- Cancellation reasons ----- */
export {
  CANCELLATION_REASON,
  CANCELLATION_REASON_VALUES,
} from './domain/entities/cancellation.entity';
export type { CancellationReason, CancelResult } from './domain/entities/cancellation.entity';

/* ----- Entities ----- */
export { FREE_SUBSCRIPTION_STATUS, isActiveSubscription } from './domain/entities/subscription.entity';
export type { SubscriptionStatus } from './domain/entities/subscription.entity';
export type { CheckoutParams, CheckoutResult } from './domain/entities/checkout.entity';
export type { OrderItem } from './domain/entities/order.entity';
export type { SyncResult } from './domain/entities/sync.entity';
export type {
  PolarProduct,
  PolarPrice,
  PolarBenefit,
  ProductListResponse,
  ProductListParams,
  RecurringInterval,
  PriceType,
} from './domain/entities/product.entity';

/* ----- Adapter contract ----- */
export type { PolarAdapter } from './domain/interfaces';

/* ----- Polar payload mapping (for custom adapters) ----- */
export { mapProduct, mapProductList } from './domain/mappers/product.mapper';
export type {
  PolarProductDto,
  PolarPriceDto,
  PolarBenefitDto,
  ProductListResponseDto,
} from './domain/mappers/product.mapper';
