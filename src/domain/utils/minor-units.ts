/**
 * Currency minor-unit math — Polar reports every amount in the
 * currency's smallest unit (cents for USD/EUR, whole yen for JPY).
 * One definition shared by the portal view layer and the server-side
 * formatter so the two can never drift apart.
 */

const MINOR_UNIT_DIVISOR = 100;

const ZERO_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set([
  'JPY', 'KRW', 'VND', 'CLP', 'PYG', 'XAF', 'XOF', 'BIF', 'DJF', 'GNF', 'XPF',
]);

/** Divisor from a Polar minor-unit amount to major units (1 for zero-decimal currencies). */
export function minorUnitDivisor(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
    ? 1
    : MINOR_UNIT_DIVISOR;
}

/** Convert a Polar minor-unit amount to the major units `Intl.NumberFormat` expects. */
export function toMajorUnits(amount: number, currency: string): number {
  return amount / minorUnitDivisor(currency);
}
