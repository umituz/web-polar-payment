/**
 * Product entity (public re-exports).
 *
 * The canonical domain types live in `domain/mappers/product.mapper.ts`.
 * This file is kept as a thin facade for backward compatibility — the
 * SDK's public surface continues to expose `PolarProduct`, `PolarPrice`,
 * `ProductListResponse`, `ProductListParams`, `RecurringInterval`, and
 * `PriceType`.
 */

export type {
  PolarProduct,
  PolarPrice,
  PolarBenefit,
  ProductListResponse,
  ProductListParams,
} from '../mappers/product.mapper';

import type { BillingCycle } from '../enums/billing-cycle.enum';

/**
 * @deprecated Polar products only ever recur on `month` or `year`. Use
 * `BillingCycle` instead for narrowed types. Kept for backward compatibility.
 */
export type RecurringInterval = 'day' | 'week' | 'month' | 'year';

/**
 * @deprecated Use `PolarAmountType` for the narrowed union of Polar price
 * amount types. Kept for backward compatibility.
 */
export type PriceType = 'fixed' | 'custom' | 'free' | 'seat_based' | 'metered_unit';

export type { BillingCycle };
