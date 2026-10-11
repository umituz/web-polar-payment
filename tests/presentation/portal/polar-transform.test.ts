/**
 * Polar entity → PlanTier transform, exercised against the SDK's own
 * camelCase domain entities (the shape `mapProduct` produces).
 */

import { describe, it, expect } from 'vitest';
import type { PolarProduct, PolarPrice } from '../../../src/domain/entities';
import {
  transformPolarProductToPlan,
  transformPolarProducts,
} from '../../../src/presentation/portal/utils/polar';

const price = (overrides?: Partial<PolarPrice>): PolarPrice => ({
  id: 'price_1',
  type: 'fixed',
  amountType: 'fixed',
  amount: 1200,
  currency: 'USD',
  recurringInterval: 'monthly',
  isArchived: false,
  productId: 'prod_1',
  ...overrides,
});

const product = (overrides?: Partial<PolarProduct>): PolarProduct => ({
  id: 'prod_1',
  name: 'Pro',
  description: 'Everything you need',
  isRecurring: true,
  recurringInterval: 'monthly',
  isArchived: false,
  organizationId: 'org_1',
  prices: [price()],
  benefits: [
    { id: 'b1', type: 'custom', description: 'Unlimited seats', properties: {} },
    { id: 'b2', type: 'custom', description: null, properties: {} },
  ],
  metadata: {},
  createdAt: '2026-01-01T00:00:00Z',
  modifiedAt: null,
  ...overrides,
});

describe('transformPolarProductToPlan', () => {
  it('projects a monthly price into a PlanTier', () => {
    const plan = transformPolarProductToPlan(product(), price());
    expect(plan).toMatchObject({
      id: 'prod_1',
      name: 'Pro',
      description: 'Everything you need',
      monthlyPrice: 1200,
      yearlyPrice: 14400, // 1200 × 12
      currency: 'USD',
    });
  });

  it('normalizes a yearly price to its monthly equivalent and keeps the yearly figure', () => {
    const plan = transformPolarProductToPlan(
      product(),
      price({ amount: 12000, recurringInterval: 'yearly' }),
    );
    expect(plan.monthlyPrice).toBe(1000); // 12000 / 12
    expect(plan.yearlyPrice).toBe(12000);
  });

  it('turns benefits into the feature list, dropping empty descriptions', () => {
    const plan = transformPolarProductToPlan(product(), price());
    expect(plan.features).toEqual(['Unlimited seats']);
  });

  it('throws on an unsupported currency', () => {
    expect(() =>
      transformPolarProductToPlan(product(), price({ currency: 'XAU' })),
    ).toThrow(/Unsupported currency/);
  });

  it('throws on a price without a recurring interval (one-time price)', () => {
    expect(() =>
      transformPolarProductToPlan(product(), price({ recurringInterval: undefined })),
    ).toThrow(/unsupported interval/);
  });
});

describe('transformPolarProducts', () => {
  it('skips archived products and archived prices', () => {
    const plans = transformPolarProducts([
      product({ id: 'archived_prod', isArchived: true }),
      product({
        id: 'prod_ok',
        prices: [price({ isArchived: true }), price({ id: 'price_ok' })],
      }),
    ]);
    expect(plans).toHaveLength(1);
    expect(plans[0].id).toBe('prod_ok');
  });

  it('emits one tier per active recurring price', () => {
    const plans = transformPolarProducts([
      product({
        prices: [
          price({ id: 'p_month', recurringInterval: 'monthly' }),
          price({ id: 'p_year', amount: 12000, recurringInterval: 'yearly' }),
        ],
      }),
    ]);
    expect(plans).toHaveLength(2);
    expect(plans.find((p) => p.monthlyPrice === 1200)).toBeDefined();
    expect(plans.find((p) => p.yearlyPrice === 12000)).toBeDefined();
  });
});
