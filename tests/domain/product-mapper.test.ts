import { describe, it, expect } from 'vitest';
import {
  mapProduct,
  mapProductList,
  type PolarProductDto,
} from '../../src/domain/mappers/product.mapper';
import {
  FREE_SUBSCRIPTION_STATUS,
  isActiveSubscription,
} from '../../src/domain/entities/subscription.entity';

const productDto: PolarProductDto = {
  id: 'prod_123',
  name: 'Pro Üyelik ✨',
  description: null,
  is_recurring: true,
  recurring_interval: 'month',
  is_archived: false,
  organization_id: 'org_1',
  prices: [
    {
      id: 'price_1',
      type: 'fixed',
      amount_type: 'fixed',
      amount: 1999,
      currency: 'USD',
      recurring_interval: 'month',
      is_archived: false,
      product_id: 'prod_123',
    },
  ],
  benefits: [
    { id: 'bn_1', type: 'custom', description: 'Everything in Free', properties: { tier: 2 } },
  ],
  metadata: { position: 1 },
  created_at: '2026-01-15T10:00:00Z',
  modified_at: null,
};

describe('mapProduct', () => {
  it('maps snake_case DTOs to camelCase domain entities', () => {
    const product = mapProduct(productDto);

    expect(product.id).toBe('prod_123');
    expect(product.isRecurring).toBe(true);
    expect(product.recurringInterval).toBe('monthly'); // legacy 'month' normalized
    expect(product.organizationId).toBe('org_1');
    expect(product.createdAt).toBe('2026-01-15T10:00:00Z');
    expect(product.prices[0]?.amountType).toBe('fixed');
    expect(product.prices[0]?.amount).toBe(1999);
    expect(product.prices[0]?.productId).toBe('prod_123');
    expect(product.benefits[0]?.properties).toEqual({ tier: 2 });
    expect(product.metadata).toEqual({ position: 1 });
  });

  it('keeps unicode names intact', () => {
    expect(mapProduct(productDto).name).toBe('Pro Üyelik ✨');
  });

  it('maps unknown recurring intervals to null', () => {
    const product = mapProduct({ ...productDto, recurring_interval: 'week' });
    expect(product.recurringInterval).toBeNull();
  });

  it('falls back to "fixed" for unknown amount types', () => {
    const product = mapProduct({
      ...productDto,
      prices: [{ ...productDto.prices[0]!, amount_type: 'exotic' }],
    });
    expect(product.prices[0]?.amountType).toBe('fixed');
  });

  it('defends against missing prices/benefits arrays', () => {
    // Deliberately malformed wire data (the DTO type rightly forbids it);
    // the mapper must still cope at runtime. `as unknown as` marks the
    // intentional boundary — see product.mapper guards.
    const malformed = { ...productDto, prices: undefined, benefits: undefined } as unknown as PolarProductDto;
    const product = mapProduct(malformed);
    expect(product.prices).toEqual([]);
    expect(product.benefits).toEqual([]);
  });

  it('throws a TypeError for absent input', () => {
    expect(() => mapProduct(null)).toThrow(TypeError);
    expect(() => mapProduct(undefined)).toThrow(TypeError);
  });
});

describe('mapProductList', () => {
  it('maps pagination fields', () => {
    const list = mapProductList({
      items: [productDto],
      pagination: { total_count: 42, max_page: 3 },
    });
    expect(list.items).toHaveLength(1);
    expect(list.pagination.totalCount).toBe(42);
    expect(list.pagination.maxPage).toBe(3);
  });

  it('returns an empty page for absent input (no crash)', () => {
    expect(mapProductList(null)).toEqual({
      items: [],
      pagination: { totalCount: 0, maxPage: 1 },
    });
    expect(mapProductList(undefined)).toEqual({
      items: [],
      pagination: { totalCount: 0, maxPage: 1 },
    });
  });

  it('tolerates a missing pagination object', () => {
    // Malformed wire data on purpose — pagination is required by the DTO type.
    const malformed = { items: [], pagination: undefined } as unknown as Parameters<typeof mapProductList>[0];
    const list = mapProductList(malformed);
    expect(list.pagination).toEqual({ totalCount: 0, maxPage: 1 });
  });
});

describe('subscription entity', () => {
  it('provides a frozen free-plan default', () => {
    expect(FREE_SUBSCRIPTION_STATUS.plan).toBe('free');
    expect(FREE_SUBSCRIPTION_STATUS.subscriptionStatus).toBe('none');
    expect(Object.isFrozen(FREE_SUBSCRIPTION_STATUS)).toBe(true);
  });

  it('treats active and trialing as active', () => {
    expect(isActiveSubscription({ plan: 'pro', subscriptionStatus: 'active' })).toBe(true);
    expect(isActiveSubscription({ plan: 'pro', subscriptionStatus: 'trialing' })).toBe(true);
    expect(isActiveSubscription({ plan: 'free', subscriptionStatus: 'none' })).toBe(false);
    expect(isActiveSubscription({ plan: 'pro', subscriptionStatus: 'canceled' })).toBe(false);
  });
});
