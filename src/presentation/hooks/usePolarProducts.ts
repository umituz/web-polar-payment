/**
 * usePolarProducts — fetches Polar products on the client.
 *
 * Caveats:
 *   - OAT tokens should NOT be shipped to the browser in production. This
 *     hook is intended for development / server-rendered setups. For
 *     production, fetch products on the server and pass them down (e.g. to
 *     `<PricingTable products={…}>`) instead of using this hook.
 *   - In-flight requests are aborted on unmount and on option change, and a
 *     superseded response never commits state.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAllProducts } from '../../infrastructure/services/polar-product.repository';
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
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePolarProducts(options: UsePolarProductsOptions): UsePolarProductsResult {
  const { apiToken, organizationId, isRecurring = true, enabled = true } = options;

  const [products, setProducts] = useState<PolarProduct[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  // Keep the latest options in a ref so `refetch` reads the current values
  // without re-creating the callback on every render.
  const optionsRef = useRef({ apiToken, organizationId, isRecurring, enabled });
  optionsRef.current = { apiToken, organizationId, isRecurring, enabled };

  // Aborts the in-flight request when dependencies change or on unmount.
  const abortRef = useRef<AbortController | null>(null);

  const fetchProducts = useCallback(async (): Promise<void> => {
    const { apiToken: token, organizationId: org, isRecurring: recurring, enabled: isEnabled } =
      optionsRef.current;

    abortRef.current?.abort();

    if (!isEnabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const params: ProductListParams = { isRecurring: recurring };
      if (org) params.organizationId = org;

      const data = await getAllProducts({ apiToken: token }, params, {
        signal: controller.signal,
      });

      // Guard: only commit state if this fetch was not superseded/aborted.
      if (controller.signal.aborted) return;
      setProducts(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error('Failed to fetch products'));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
    return () => {
      abortRef.current?.abort();
    };
  }, [apiToken, organizationId, isRecurring, enabled, fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}
