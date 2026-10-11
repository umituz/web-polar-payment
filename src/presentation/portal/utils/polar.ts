/**
 * Polar entity → PlanTier transform
 *
 * Bridges this SDK's own camelCase domain entities (`PolarProduct`,
 * `PolarPrice` from `domain/entities`) into the portal's `PlanTier` view
 * model. No local PolarProduct/PolarPrice re-declarations — the mapper in
 * `domain/mappers/product.mapper.ts` already canonicalizes wire values
 * (including the `month`/`year` aliases) before we see them.
 *
 * No `any`, no magic numbers, no implicit fallbacks that mask failures.
 */

import type { PolarPrice, PolarProduct } from '../../../domain/entities';
import type { PlanTier } from '../types';
import { CURRENCY, type Currency } from '../constants';

/**
 * Number of months in a year — single source of truth for
 * monthly/yearly price conversions.
 */
const MONTHS_IN_YEAR = 12;

const KNOWN_CURRENCIES: ReadonlySet<string> = new Set(Object.values(CURRENCY));

/**
 * Convert a Polar currency code to a typed Currency.
 * Throws on unknown codes so bad data fails loud instead of
 * producing a plan with an un-renderable currency.
 */
const toCurrency = (raw: string): Currency => {
  const upper = raw.toUpperCase();
  if (KNOWN_CURRENCIES.has(upper)) return upper as Currency;
  throw new Error(`Unsupported currency from Polar: ${raw}`);
};

/**
 * Convert a single Polar price to a normalized monthly amount.
 * Throws when the price has no recurring interval (one-time prices
 * cannot be shown as subscription tiers).
 */
const toMonthlyAmount = (amount: number, interval: string | undefined): number => {
  if (interval === 'monthly') return amount;
  if (interval === 'yearly') return amount / MONTHS_IN_YEAR;
  throw new Error(
    `Cannot convert Polar price to monthly: unsupported interval "${interval ?? 'undefined'}"`,
  );
};

/**
 * Project a Polar product + one of its recurring prices into a `PlanTier`.
 * Benefits become the feature list (empty descriptions dropped).
 */
export function transformPolarProductToPlan(product: PolarProduct, price: PolarPrice): PlanTier {
  const interval = price.recurringInterval;
  const monthlyAmount = toMonthlyAmount(price.amount ?? 0, interval);
  const yearlyAmount = interval === 'yearly' ? price.amount ?? 0 : (price.amount ?? 0) * MONTHS_IN_YEAR;

  return {
    id: product.id,
    name: product.name,
    description: product.description ?? '',
    monthlyPrice: Math.round(monthlyAmount),
    yearlyPrice: Math.round(yearlyAmount),
    currency: toCurrency(price.currency),
    features: product.benefits
      .map((benefit) => benefit.description ?? '')
      .filter((description) => description.length > 0),
  };
}

/**
 * Transform every active recurring price of every unarchived product into
 * plan tiers — a product with both monthly and yearly prices yields two
 * tiers (same behavior as the dashboard original).
 */
export function transformPolarProducts(products: PolarProduct[]): PlanTier[] {
  return products
    .filter((product) => !product.isArchived)
    .flatMap((product) =>
      product.prices
        .filter((price) => !price.isArchived && price.recurringInterval !== undefined)
        .map((price) => transformPolarProductToPlan(product, price)),
    );
}
