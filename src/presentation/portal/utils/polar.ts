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

/** Benefits become the feature list (empty descriptions dropped). */
const productFeatures = (product: PolarProduct): string[] =>
  product.benefits
    .map((benefit) => benefit.description ?? '')
    .filter((description) => description.length > 0);

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
    features: productFeatures(product),
  };
}

/**
 * Transform every unarchived product into exactly one plan tier. A product
 * with both a monthly and a yearly recurring price keeps the two real
 * figures — the yearly discount is whatever Polar actually charges. A
 * product with a single recurring price derives the missing figure from
 * it (×12 or ÷12); a product with no recurring price is skipped.
 */
export function transformPolarProducts(products: PolarProduct[]): PlanTier[] {
  const tiers: PlanTier[] = [];
  for (const product of products) {
    if (product.isArchived) continue;
    const recurring = product.prices.filter(
      (price) => !price.isArchived && price.recurringInterval !== undefined,
    );
    const monthly = recurring.find((price) => price.recurringInterval === 'monthly');
    const yearly = recurring.find((price) => price.recurringInterval === 'yearly');
    if (monthly && yearly) {
      tiers.push({
        id: product.id,
        name: product.name,
        description: product.description ?? '',
        monthlyPrice: Math.round(monthly.amount ?? 0),
        yearlyPrice: Math.round(yearly.amount ?? 0),
        currency: toCurrency(monthly.currency),
        features: productFeatures(product),
      });
    } else if (monthly) {
      tiers.push(transformPolarProductToPlan(product, monthly));
    } else if (yearly) {
      tiers.push(transformPolarProductToPlan(product, yearly));
    }
  }
  return tiers;
}
