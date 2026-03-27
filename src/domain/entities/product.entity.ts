/**
 * Product Entity
 *
 * Represents a Polar.sh product with pricing information
 */

export type RecurringInterval = 'day' | 'week' | 'month' | 'year';

export type PriceType = 'fixed' | 'custom' | 'free' | 'seat_based' | 'metered_unit';

export interface PolarPrice {
  id: string;
  type: PriceType;
  amount_type: string;
  amount?: number;
  currency: string;
  recurring_interval?: RecurringInterval;
  is_archived: boolean;
  product_id: string;
  legacy?: boolean;
}

export interface PolarProduct {
  id: string;
  name: string;
  description: string | null;
  is_recurring: boolean;
  recurring_interval: RecurringInterval | null;
  is_archived: boolean;
  organization_id: string;
  prices: PolarPrice[];
  benefits: Array<{
    id: string;
    type: string;
    description: string | null;
    properties: Record<string, unknown>;
  }>;
  metadata: Record<string, unknown>;
  created_at: string;
  modified_at: string | null;
}

export interface ProductListResponse {
  items: PolarProduct[];
  pagination: {
    total_count: number;
    max_page: number;
  };
}

export interface ProductListParams {
  organizationId?: string;
  isRecurring?: boolean;
  page?: number;
  limit?: number;
}
