/**
 * ProductPricing — picks the right price for a Polar product and
 * computes display labels.
 *
 * Polar products may carry multiple prices (one per interval /
 * currency / amount-type combo). Centralizing the "which price wins"
 * rule keeps the UI consistent and lets tests assert the rule without
 * rendering a component.
 */

import type { BillingCycle, PolarProduct, PolarPrice } from '../../domain/entities';

export const FALLBACK_PRICE_LABEL = 'Custom';

export class ProductPricing {
  /**
   * Pick the first price that recurs on `cycle`. If the product has no
   * recurring prices, return the first one. Returns `null` for products
   * with no prices.
   */
  static recurringPrice(product: PolarProduct, cycle?: BillingCycle): PolarPrice | null {
    const recurring = product.prices.filter(
      (p) => p.recurringInterval !== undefined,
    );
    if (recurring.length === 0) {
      return product.prices[0] ?? null;
    }
    if (cycle) {
      const match = recurring.find((p) => p.recurringInterval === cycle);
      if (match) return match;
    }
    return recurring[0] ?? null;
  }

  /**
   * Build a "{amount} / {interval}" string. Returns the standalone
   * amount label when there is no interval.
   */
  static displayLine(
    product: PolarProduct,
    formatter: (amount: number | undefined, currency: string | undefined) => string,
    cycle?: BillingCycle,
  ): { amount: string; interval: string | null } {
    const price = ProductPricing.recurringPrice(product, cycle);
    if (!price) {
      return { amount: FALLBACK_PRICE_LABEL, interval: null };
    }
    const amount = formatter(price.amount, price.currency);
    return { amount, interval: price.recurringInterval ?? null };
  }
}
