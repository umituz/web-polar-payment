import { describe, it, expect } from 'vitest';
import { normalizeStatus, normalizeBillingCycle } from '../../src/infrastructure/utils/normalization.util';
import { normalizeUserId, isValidProductId } from '../../src/infrastructure/utils/validation.util';
import {
  isValidCheckoutUrl,
  isInsecureUrl,
  isLoopbackHost,
  isProductionInsecureUrl,
} from '../../src/infrastructure/utils/security.util';
import { asString, asBoolean, isTimestamp, asRecord } from '../../src/infrastructure/utils/type-guards.util';
import { QueryBuilder } from '../../src/infrastructure/query/query-builder';
import { PaginationClamp, MIN_PAGE_SIZE } from '../../src/infrastructure/utils/pagination-clamp';
import { MoneyFormatter } from '../../src/infrastructure/utils/money-formatter';
import { DateRenderer } from '../../src/infrastructure/utils/date-renderer';

describe('normalization', () => {
  it('keeps known statuses and defaults everything else to none', () => {
    expect(normalizeStatus('active')).toBe('active');
    expect(normalizeStatus('WEIRD')).toBe('none');
    expect(normalizeStatus(null)).toBe('none');
    expect(normalizeStatus(undefined)).toBe('none');
  });

  it('normalizes legacy Polar intervals to canonical billing cycles', () => {
    // Regression: legacy 'month' must come out as canonical 'monthly', never
    // leak through as 'month' typed as BillingCycle.
    expect(normalizeBillingCycle('month')).toBe('monthly');
    expect(normalizeBillingCycle('year')).toBe('yearly');
    expect(normalizeBillingCycle('monthly')).toBe('monthly');
    expect(normalizeBillingCycle('nonsense')).toBe('monthly');
    expect(normalizeBillingCycle(null)).toBe('monthly');
  });
});

describe('validation', () => {
  it('trims and rejects empty user ids', () => {
    expect(normalizeUserId('  user  ')).toBe('user');
    expect(normalizeUserId('   ')).toBeUndefined();
    expect(normalizeUserId('')).toBeUndefined();
    expect(normalizeUserId(undefined)).toBeUndefined();
  });

  it('validates product ids by type and content', () => {
    expect(isValidProductId('prod_1')).toBe(true);
    expect(isValidProductId('  ')).toBe(false);
    expect(isValidProductId('')).toBe(false);
    expect(isValidProductId(42)).toBe(false);
    expect(isValidProductId(null)).toBe(false);
  });
});

describe('security utils', () => {
  it('accepts http and https for checkout URLs', () => {
    expect(isValidCheckoutUrl('https://polar.sh/checkout')).toBe(true);
    expect(isValidCheckoutUrl('http://localhost:3000/c')).toBe(true);
    expect(isValidCheckoutUrl('javascript:alert(1)')).toBe(false);
    expect(isValidCheckoutUrl('/relative/path')).toBe(false);
    expect(isValidCheckoutUrl('')).toBe(false);
  });

  it('flags insecure URLs but exempts loopback hosts', () => {
    expect(isInsecureUrl('http://example.com/x')).toBe(true);
    expect(isInsecureUrl('https://example.com/x')).toBe(false);

    expect(isLoopbackHost('http://localhost:3000/x')).toBe(true);
    expect(isLoopbackHost('http://127.0.0.1/x')).toBe(true);
    expect(isLoopbackHost('http://[::1]/x')).toBe(true);
    expect(isLoopbackHost('http://example.com/x')).toBe(false);
    expect(isLoopbackHost('not a url')).toBe(false);

    expect(isProductionInsecureUrl('http://example.com/x')).toBe(true);
    expect(isProductionInsecureUrl('http://localhost:3000/x')).toBe(false);
    expect(isProductionInsecureUrl('https://example.com/x')).toBe(false);
  });
});

describe('type guards', () => {
  it('coerces unknowns safely', () => {
    expect(asString('x')).toBe('x');
    expect(asString(1)).toBeUndefined();
    expect(asBoolean(true)).toBe(true);
    expect(asBoolean('true')).toBeUndefined();
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord(null)).toEqual({});
    expect(asRecord('str')).toEqual({});
  });

  it('recognizes Firestore-style timestamps', () => {
    expect(isTimestamp({ toDate: () => new Date(0) })).toBe(true);
    expect(isTimestamp({ toDate: 'nope' })).toBe(false);
    expect(isTimestamp(new Date())).toBe(false);
    expect(isTimestamp(null)).toBe(false);
  });
});

describe('QueryBuilder', () => {
  it('skips null and undefined values', () => {
    const query = new QueryBuilder()
      .set('a', 1)
      .set('b', undefined)
      .set('c', null)
      .set('d', false)
      .toString();
    expect(query).toBe('a=1&d=false');
  });

  it('supports bulk set and chaining', () => {
    const query = new QueryBuilder({ x: 'y', skip: undefined }).set('z', 3).toString();
    expect(query).toBe('x=y&z=3');
  });
});

describe('PaginationClamp', () => {
  it('clamps page sizes into [1, max]', () => {
    expect(PaginationClamp.pageSize(500)).toBe(100);
    expect(PaginationClamp.pageSize(0)).toBe(MIN_PAGE_SIZE);
    expect(PaginationClamp.pageSize(-5)).toBe(MIN_PAGE_SIZE);
    expect(PaginationClamp.pageSize(50)).toBe(50);
    expect(PaginationClamp.pageSize(undefined)).toBe(100);
    expect(PaginationClamp.pageSize(50, 10)).toBe(10);
  });
});

describe('MoneyFormatter', () => {
  it('divides minor units by 100 for decimal currencies', () => {
    expect(new MoneyFormatter().format(1999, 'USD')).toBe('$19.99');
  });

  it('treats zero-decimal currencies as major units', () => {
    expect(new MoneyFormatter().format(2000, 'JPY')).toContain('2,000');
    expect(new MoneyFormatter().format(2000, 'JPY')).not.toContain('20');
  });

  it('returns a contact-sales label for absent amounts', () => {
    expect(new MoneyFormatter().format(undefined, 'USD')).toBe('Custom');
    // Malformed wire data on purpose — null is not part of the signature.
    expect(new MoneyFormatter().format(null as unknown as number, 'USD')).toBe('Custom');
  });

  it('falls back to a plain amount for invalid currency codes', () => {
    expect(new MoneyFormatter().format(1999, 'NOPE')).toBe('1999 NOPE');
  });

  it('honors a custom locale', () => {
    const formatted = new MoneyFormatter('de-DE').format(1999, 'USD');
    expect(formatted).toContain('19,99');
  });

  it('renders negative amounts (refunds/credits)', () => {
    expect(new MoneyFormatter().format(-500, 'USD')).toBe('-$5.00');
  });
});

describe('DateRenderer', () => {
  it('renders the ISO date prefix in short mode', () => {
    expect(new DateRenderer().short('2026-12-31T23:59:59Z')).toBe('2026-12-31');
  });

  it('falls back for absent or unparseable dates', () => {
    expect(new DateRenderer().short(null)).toBe('—');
    expect(new DateRenderer().renewal(undefined)).toBe('soon');
    expect(new DateRenderer().renewal(null, 'later')).toBe('later');
    expect(DateRenderer.parse('garbage')).toBeNull();
    expect(DateRenderer.parse(null)).toBeNull();
  });

  it('formats renewal dates in the configured locale', () => {
    expect(new DateRenderer('en-US').renewal('2026-12-31T00:00:00Z')).toBe('Dec 31, 2026');
    const long = new DateRenderer('en-US').long('2026-12-31T00:00:00Z');
    expect(long).toBe('December 31, 2026');
  });

  it('passes through unparseable input in long mode', () => {
    expect(new DateRenderer().long('garbage')).toBe('garbage');
  });
});
