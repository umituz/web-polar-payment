/**
 * MoneyFormatter — formats Polar.sh amounts for display.
 *
 * Polar stores amounts as the smallest currency unit (cents for USD,
 * yen for JPY, etc.). Centralizing the formatting here means:
 *   - The "divide by 100" rule lives in one place
 *   - Locale and currency defaults are explicit
 *   - Custom currencies (e.g. zero-decimal) can be added without
 *     touching call sites
 */

import { minorUnitDivisor } from '../../domain/utils/minor-units';

const DEFAULT_LOCALE = 'en-US';
const DEFAULT_CURRENCY = 'USD';

export interface MoneyFormatOptions {
  locale?: string;
  fallbackCurrency?: string;
  maximumFractionDigits?: number;
}

export class MoneyFormatter {
  private readonly locale: string;

  constructor(locale: string = DEFAULT_LOCALE) {
    this.locale = locale;
  }

  /**
   * Format a Polar amount (smallest unit) as a localized currency string.
   * Returns the fallback label (e.g. `"Custom"`) when the amount is
   * undefined — the Polar contract signals "contact sales" by omitting
   * the amount.
   */
  format(
    amount: number | undefined,
    currency: string | undefined,
    options: MoneyFormatOptions = {},
  ): string {
    if (amount === undefined || amount === null) {
      return 'Custom';
    }
    const code = (currency ?? options.fallbackCurrency ?? DEFAULT_CURRENCY).toUpperCase();
    try {
      return new Intl.NumberFormat(this.locale, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: options.maximumFractionDigits ?? 2,
      }).format(amount / minorUnitDivisor(code));
    } catch {
      return `${amount} ${code}`;
    }
  }
}
