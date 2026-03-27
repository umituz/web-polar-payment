/**
 * usePolarProducts Hook
 *
 * Fetch and manage products from Polar.sh API
 */

import { useState, useEffect } from 'react';
import { getAllProducts } from '../../infrastructure/services/polar-api.service';
import type { PolarProduct, ProductListParams } from '../../domain/entities/product.entity';

export interface UsePolarProductsOptions {
  apiToken: string;
  organizationId?: string;
  isRecurring?: boolean;
  enabled?: boolean;
}

export interface UsePolarProductsResult {
  products: PolarProduct[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch products from Polar.sh API
 *
 * @example
 * ```tsx
 * const { products, loading, error } = usePolarProducts({
 *   apiToken: polarApiToken,
 *   organizationId: polarOrgId,
 *   isRecurring: true,
 * });
 * ```
 */
export function usePolarProducts(options: UsePolarProductsOptions): UsePolarProductsResult {
  const { apiToken, organizationId, isRecurring = true, enabled = true } = options;

  const [products, setProducts] = useState<PolarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params: ProductListParams = {
        isRecurring,
      };

      if (organizationId) {
        params.organizationId = organizationId;
      }

      const data = await getAllProducts({ apiToken }, params);
      setProducts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(message);
      console.error('usePolarProducts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [apiToken, organizationId, isRecurring, enabled]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
}
