/**
 * DateRenderer — renders ISO date strings for UI display.
 *
 * Polar returns `created_at` / `currentPeriodEnd` as ISO 8601 strings.
 * Centralizing the rendering keeps the date format (and locale) in one
 * place, and lets callers test the rendering without mocking `Date`.
 */

const DEFAULT_LOCALE = 'en-US';

/** `YYYY-MM-DD` — the compact prefix of an ISO 8601 timestamp. */
const ISO_DATE_DISPLAY_LENGTH = 10;
const FALLBACK_DATE_LABEL = 'soon';
const FALLBACK_LONG_DATE = '—';

export class DateRenderer {
  private readonly dateLength: number;
  private readonly shortFormatter: Intl.DateTimeFormat;
  private readonly longFormatter: Intl.DateTimeFormat;

  constructor(
    locale: string = DEFAULT_LOCALE,
    dateLength: number = ISO_DATE_DISPLAY_LENGTH,
  ) {
    this.dateLength = dateLength;
    this.shortFormatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    this.longFormatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Render the first `dateLength` characters of an ISO timestamp — used
   * in tables and compact UI.
   */
  short(iso: string | null | undefined): string {
    if (!iso) return FALLBACK_LONG_DATE;
    return iso.slice(0, this.dateLength);
  }

  /**
   * Render a human-readable "Renews Jan 15, 2026" style label. Returns
   * the fallback (`'soon'`) when the input is missing.
   */
  renewal(iso: string | null | undefined, fallback: string = FALLBACK_DATE_LABEL): string {
    const date = DateRenderer.parse(iso);
    if (!date) return fallback;
    return this.shortFormatter.format(date);
  }

  /**
   * Render the date in a long format suitable for cards.
   */
  long(iso: string | null | undefined): string {
    if (!iso) return FALLBACK_LONG_DATE;
    const date = DateRenderer.parse(iso);
    if (!date) return iso;
    return this.longFormatter.format(date);
  }

  /**
   * Parse an ISO 8601 string. Returns `null` for unparseable input so
   * callers can fall back to their own placeholder.
   */
  static parse(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
