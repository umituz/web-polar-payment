/**
 * Product mapper.
 *
 * Polar.sh exposes snake_case fields. This mapper is the single boundary that
 * translates the public API contract into idiomatic camelCase domain types —
 * the rest of the SDK never touches snake_case.
 */

import type { PolarAmountType } from '../enums/amount-type.enum';
import { parseBillingCycle, type BillingCycle } from '../enums/billing-cycle.enum';

/* ------------------------------------------------------------------ */
/* DTOs (raw Polar.sh payload, snake_case)                             */
/* ------------------------------------------------------------------ */

export interface PolarProductDto {
  id: string;
  name: string;
  description: string | null;
  is_recurring: boolean;
  recurring_interval: string | null;
  is_archived: boolean;
  organization_id: string;
  prices: PolarPriceDto[];
  benefits: PolarBenefitDto[];
  metadata: Record<string, unknown>;
  created_at: string;
  modified_at: string | null;
}

export interface PolarPriceDto {
  id: string;
  type: string;
  amount_type: string;
  amount?: number;
  currency: string;
  recurring_interval?: string;
  is_archived: boolean;
  product_id: string;
  legacy?: boolean;
}

export interface PolarBenefitDto {
  id: string;
  type: string;
  description: string | null;
  properties: Record<string, unknown>;
}

export interface ProductListResponseDto {
  items: PolarProductDto[];
  pagination: {
    total_count: number;
    max_page: number;
  };
}

/* ------------------------------------------------------------------ */
/* Domain entities (camelCase)                                         */
/* ------------------------------------------------------------------ */

export interface PolarPrice {
  id: string;
  type: PolarAmountType;
  amountType: PolarAmountType;
  amount?: number;
  currency: string;
  recurringInterval?: BillingCycle;
  isArchived: boolean;
  productId: string;
  legacy?: boolean;
}

export interface PolarBenefit {
  id: string;
  type: string;
  description: string | null;
  properties: Record<string, unknown>;
}

export interface PolarProduct {
  id: string;
  name: string;
  description: string | null;
  isRecurring: boolean;
  recurringInterval: BillingCycle | null;
  isArchived: boolean;
  organizationId: string;
  prices: PolarPrice[];
  benefits: PolarBenefit[];
  metadata: Record<string, unknown>;
  createdAt: string;
  modifiedAt: string | null;
}

export interface ProductListResponse {
  items: PolarProduct[];
  pagination: {
    totalCount: number;
    maxPage: number;
  };
}

export interface ProductListParams {
  organizationId?: string;
  isRecurring?: boolean;
  page?: number;
  limit?: number;
}

/* ------------------------------------------------------------------ */
/* Mapping (DTO -> Domain)                                             */
/* ------------------------------------------------------------------ */

const KNOWN_AMOUNT_TYPES: ReadonlySet<string> = new Set([
  'fixed',
  'custom',
  'free',
  'seat_based',
  'metered_unit',
]);

function toAmountType(raw: string | undefined): PolarAmountType {
  if (raw && KNOWN_AMOUNT_TYPES.has(raw)) return raw as PolarAmountType;
  return 'fixed';
}

function toBillingCycle(interval: string | null | undefined): BillingCycle | null {
  return parseBillingCycle(interval);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toPrice(dto: PolarPriceDto): PolarPrice {
  return {
    id: String(dto.id),
    type: toAmountType(dto.type),
    amountType: toAmountType(dto.amount_type),
    amount: typeof dto.amount === 'number' ? dto.amount : undefined,
    currency: String(dto.currency),
    recurringInterval: toBillingCycle(dto.recurring_interval) ?? undefined,
    isArchived: Boolean(dto.is_archived),
    productId: String(dto.product_id),
    legacy: Boolean(dto.legacy),
  };
}

function toBenefit(dto: PolarBenefitDto): PolarBenefit {
  return {
    id: String(dto.id),
    type: String(dto.type),
    description: dto.description ?? null,
    properties: asRecord(dto.properties),
  };
}

/**
 * Map a raw Polar product payload. Throws a `TypeError` for absent input —
 * callers that can receive empty bodies should check first and surface a
 * typed error.
 */
export function mapProduct(dto: PolarProductDto | null | undefined): PolarProduct {
  if (!dto || typeof dto !== 'object') {
    throw new TypeError('mapProduct: expected a Polar product DTO object');
  }
  return {
    id: String(dto.id),
    name: String(dto.name),
    description: dto.description ?? null,
    isRecurring: Boolean(dto.is_recurring),
    recurringInterval: toBillingCycle(dto.recurring_interval),
    isArchived: Boolean(dto.is_archived),
    organizationId: String(dto.organization_id),
    prices: Array.isArray(dto.prices) ? dto.prices.map(toPrice) : [],
    benefits: Array.isArray(dto.benefits) ? dto.benefits.map(toBenefit) : [],
    metadata: asRecord(dto.metadata),
    createdAt: String(dto.created_at),
    modifiedAt: dto.modified_at ?? null,
  };
}

/**
 * Map a raw Polar product-list payload. Absent or malformed input maps to
 * an empty page instead of throwing — list responses are safely ignorable.
 */
export function mapProductList(
  dto: ProductListResponseDto | null | undefined,
): ProductListResponse {
  if (!dto || typeof dto !== 'object') {
    return { items: [], pagination: { totalCount: 0, maxPage: 1 } };
  }
  return {
    items: Array.isArray(dto.items) ? dto.items.map(mapProduct) : [],
    pagination: {
      totalCount: Number(dto.pagination?.total_count ?? 0),
      maxPage: Number(dto.pagination?.max_page ?? 1),
    },
  };
}
