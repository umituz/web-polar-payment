/**
 * Tests for pure billing portal utilities (moved from web-dashboard's
 * billing domain, adapted to the tone/labels contract).
 */

import { describe, it, expect } from 'vitest';
import type { Invoice, InvoiceStatus, UsageMetric } from '../../../src/presentation/portal/types';
import {
  calculateDiscount,
  calculateUsagePercentage,
  isNearLimit,
  groupInvoicesByStatus,
  calculateInvoiceTotal,
  sortInvoicesByDate,
  formatExpiry,
  getPlanPrice,
  getStatusTone,
  getInvoiceStatusTone,
} from '../../../src/presentation/portal/utils/billing';
import {
  DEFAULT_BILLING_LABELS,
  mergeLabels,
  formatLabel,
} from '../../../src/presentation/portal/labels';
import { SUBSCRIPTION_STATUS, INVOICE_STATUS } from '../../../src/presentation/portal/constants';

const makeInvoice = (id: string, status: InvoiceStatus, amount: number, date: string): Invoice =>
  ({
    id,
    number: `INV-${id}`,
    date,
    dueDate: date,
    amount,
    currency: 'USD',
    status,
  }) as Invoice;

const makeMetric = (current: number, limit: number): UsageMetric =>
  ({
    id: 'm1',
    name: 'Posts',
    current,
    limit,
    unit: 'posts',
    resetPeriod: 'monthly',
  }) as UsageMetric;

describe('calculateDiscount', () => {
  it('returns 0 when the monthly price is 0', () => {
    expect(calculateDiscount(0, 100)).toBe(0);
  });

  it('returns 0 when yearly is not cheaper', () => {
    expect(calculateDiscount(10, 240)).toBe(0); // 240/12 = 20 > 10
  });

  it('computes the yearly discount percentage', () => {
    // yearly monthly equivalent = 96/12 = 8 → (12-8)/12 = 33%
    expect(calculateDiscount(12, 96)).toBe(33);
  });

  it('never returns a negative discount', () => {
    expect(calculateDiscount(10, 121)).toBe(0);
  });
});

describe('calculateUsagePercentage / isNearLimit', () => {
  it('returns 0 for an unlimited (limit 0) metric', () => {
    expect(calculateUsagePercentage(makeMetric(50, 0))).toBe(0);
    expect(isNearLimit(makeMetric(50, 0))).toBe(false);
  });

  it('clamps the percentage at 100', () => {
    expect(calculateUsagePercentage(makeMetric(150, 100))).toBe(100);
  });

  it('detects near-limit at the default 80% threshold', () => {
    expect(isNearLimit(makeMetric(79, 100))).toBe(false);
    expect(isNearLimit(makeMetric(80, 100))).toBe(true);
  });
});

describe('groupInvoicesByStatus', () => {
  it('always includes every status key, even when empty', () => {
    const grouped = groupInvoicesByStatus([]);
    const expectedKeys: InvoiceStatus[] = [
      'draft',
      'open',
      'paid',
      'void',
      'uncollectible',
      'refunded',
    ];
    expect(Object.keys(grouped).sort()).toEqual(expectedKeys.sort());
    expectedKeys.forEach((key) => expect(grouped[key]).toEqual([]));
  });

  it('groups invoices by status', () => {
    const grouped = groupInvoicesByStatus([
      makeInvoice('1', 'paid', 10, '2026-01-01'),
      makeInvoice('2', 'paid', 20, '2026-02-01'),
      makeInvoice('3', 'refunded', 30, '2026-03-01'),
    ]);
    expect(grouped.paid).toHaveLength(2);
    expect(grouped.refunded).toHaveLength(1);
    expect(grouped.draft).toHaveLength(0);
  });
});

describe('calculateInvoiceTotal', () => {
  const invoices = [
    makeInvoice('1', 'paid', 10, '2026-01-01'),
    makeInvoice('2', 'open', 20, '2026-02-01'),
  ];

  it('sums all invoices without a filter', () => {
    expect(calculateInvoiceTotal(invoices)).toBe(30);
  });

  it('filters by status first', () => {
    expect(calculateInvoiceTotal(invoices, 'paid')).toBe(10);
  });
});

describe('sortInvoicesByDate', () => {
  it('sorts descending by default', () => {
    const sorted = sortInvoicesByDate([
      makeInvoice('1', 'paid', 10, '2026-01-01'),
      makeInvoice('2', 'paid', 10, '2026-03-01'),
    ]);
    expect(sorted[0].id).toBe('2');
  });

  it('sorts ascending on request', () => {
    const sorted = sortInvoicesByDate(
      [
        makeInvoice('1', 'paid', 10, '2026-01-01'),
        makeInvoice('2', 'paid', 10, '2026-03-01'),
      ],
      'asc',
    );
    expect(sorted[0].id).toBe('1');
  });

  it('does not mutate the input array', () => {
    const input = [
      makeInvoice('1', 'paid', 10, '2026-01-01'),
      makeInvoice('2', 'paid', 10, '2026-03-01'),
    ];
    sortInvoicesByDate(input);
    expect(input[0].id).toBe('1');
  });
});

describe('formatExpiry', () => {
  it('formats as MM/YY with zero padding', () => {
    expect(formatExpiry(3, 2027)).toBe('03/27');
  });
});

describe('getPlanPrice', () => {
  const plan = { id: 'p', name: 'Pro', monthlyPrice: 10, yearlyPrice: 100, currency: 'USD' } as Parameters<
    typeof getPlanPrice
  >[0];

  it('returns the monthly price on the monthly cycle', () => {
    expect(getPlanPrice(plan, 'monthly')).toBe(10);
  });

  it('returns the yearly price on the yearly cycle', () => {
    expect(getPlanPrice(plan, 'yearly')).toBe(100);
  });
});

describe('status tones', () => {
  it('maps every subscription status to a tone', () => {
    expect(getStatusTone('active')).toBe('active');
    expect(getStatusTone('past_due')).toBe('warning');
    expect(getStatusTone('revoked')).toBe('danger');
    expect(getStatusTone('canceled')).toBe('neutral');
  });

  it('maps every invoice status to a tone', () => {
    expect(getInvoiceStatusTone('paid')).toBe('active');
    expect(getInvoiceStatusTone('open')).toBe('warning');
    expect(getInvoiceStatusTone('uncollectible')).toBe('danger');
  });
});

describe('label catalog contract', () => {
  it('covers every subscription status value', () => {
    for (const status of Object.values(SUBSCRIPTION_STATUS)) {
      expect(DEFAULT_BILLING_LABELS.status[status], `status "${status}"`).toBeTruthy();
    }
  });

  it('covers every invoice status value', () => {
    for (const status of Object.values(INVOICE_STATUS)) {
      expect(DEFAULT_BILLING_LABELS.invoiceStatus[status], `invoice status "${status}"`).toBeTruthy();
    }
  });

  it('mergeLabels deep-merges over the defaults without mutating them', () => {
    const merged = mergeLabels({
      tabs: { overview: 'Özet' },
      status: { active: 'Aktif' },
    });
    expect(merged.tabs.overview).toBe('Özet');
    expect(merged.tabs.invoices).toBe(DEFAULT_BILLING_LABELS.tabs.invoices);
    expect(merged.status.active).toBe('Aktif');
    expect(merged.status.canceled).toBe(DEFAULT_BILLING_LABELS.status.canceled);
    // Originals untouched
    expect(DEFAULT_BILLING_LABELS.tabs.overview).toBe('Overview');
    expect(DEFAULT_BILLING_LABELS.status.active).toBe('Active');
  });

  it('formatLabel replaces placeholders and leaves unknown ones intact', () => {
    expect(formatLabel('Save {percent}%', { percent: 20 })).toBe('Save 20%');
    expect(formatLabel('Contact {email}', { email: 'a@b.c' })).toBe('Contact a@b.c');
    expect(formatLabel('Save {percent}%', {})).toBe('Save {percent}%');
  });
});
