/**
 * Polar API Service
 *
 * Direct client-side calls to Polar.sh API using OAT authentication
 * Note: OAT tokens should only be used server-side in production
 * This service is intended for server-side or edge function usage
 */

import type {
  PolarProduct,
  ProductListResponse,
  ProductListParams
} from '../../domain/entities/product.entity';

export interface PolarApiConfig {
  apiToken: string;
  baseUrl?: string;
}

/**
 * Fetch products from Polar.sh API
 *
 * @param config - Polar API configuration with OAT token
 * @param params - Query parameters for filtering products
 * @returns Paginated list of products
 *
 * @example
 * ```ts
 * const products = await getProducts({
 *   apiToken: 'polar_oat_xxx',
 *   baseUrl: 'https://api.polar.sh/v1'
 * }, {
 *   organizationId: 'org-123',
 *   isRecurring: true,
 *   page: 1,
 *   limit: 100
 * });
 * ```
 */
export async function getProducts(
  config: PolarApiConfig,
  params?: ProductListParams
): Promise<ProductListResponse> {
  const baseUrl = config.baseUrl || 'https://api.polar.sh/v1';
  const url = new URL(`${baseUrl}/products`);

  if (params?.organizationId) {
    url.searchParams.set('organization_id', params.organizationId);
  }

  if (params?.isRecurring !== undefined) {
    url.searchParams.set('is_recurring', String(params.isRecurring));
  }

  if (params?.page) {
    url.searchParams.set('page', String(params.page));
  }

  if (params?.limit) {
    url.searchParams.set('limit', String(Math.min(params.limit, 100)));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Polar API error: ${response.status} ${response.statusText}\n${error}`
    );
  }

  const data = await response.json();
  return data as ProductListResponse;
}

/**
 * Fetch a single product by ID
 *
 * @param config - Polar API configuration
 * @param productId - Product ID to fetch
 * @returns Product details or null if not found
 */
export async function getProductById(
  config: PolarApiConfig,
  productId: string
): Promise<PolarProduct | null> {
  const baseUrl = config.baseUrl || 'https://api.polar.sh/v1';
  const url = `${baseUrl}/products/${productId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Accept': 'application/json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Polar API error: ${response.status} ${response.statusText}\n${error}`
    );
  }

  const data = await response.json();
  return data as PolarProduct;
}

/**
 * Fetch all products with automatic pagination
 *
 * @param config - Polar API configuration
 * @param params - Query parameters for filtering
 * @returns All products matching the criteria
 */
export async function getAllProducts(
  config: PolarApiConfig,
  params?: Omit<ProductListParams, 'page' | 'limit'>
): Promise<PolarProduct[]> {
  const allProducts: PolarProduct[] = [];
  let page = 1;
  let maxPage = 1;

  do {
    const response = await getProducts(config, {
      ...params,
      page,
      limit: 100,
    });

    allProducts.push(...response.items);
    maxPage = response.pagination.max_page;
    page++;
  } while (page <= maxPage);

  return allProducts;
}
