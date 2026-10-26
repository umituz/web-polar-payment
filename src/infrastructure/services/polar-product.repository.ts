/**
 * PolarProductRepository — Repository pattern over the Polar.sh products API.
 *
 * Responsibilities (single):
 *   - Build authenticated requests to Polar.sh
 *   - Map the snake_case DTOs to the canonical camelCase domain entities
 *   - Surface clean errors for non-2xx responses
 *
 * Depends only on `HttpClient` (Strategy) and the product mapper. It does
 * NOT know about React or any other transport.
 */

import {
  POLAR_API_BASE_URL,
  POLAR_API_MAX_PAGE_SIZE,
} from '../constants/billing.constants';
import { HttpClient } from '../http/http-client';
import { FetchHttpClient } from '../http/http-client';
import { QueryBuilder } from '../query/query-builder';
import { PageIterator, type Page, type PageFetcher } from '../pagination/page-iterator';
import { PaginationClamp } from '../utils/pagination-clamp';
import {
  mapProduct,
  mapProductList,
  type PolarProduct,
  type PolarProductDto,
  type ProductListParams,
  type ProductListResponse,
} from '../../domain/mappers/product.mapper';

export interface PolarApiConfig {
  apiToken: string;
  baseUrl?: string;
}

/** Options shared by the request-performing methods. */
export interface PolarRequestOptions {
  /** Aborts the request (and any follow-up pages) when fired. */
  signal?: AbortSignal;
  /** Request budget in ms; defaults to the HTTP client's 15s. */
  timeoutMs?: number;
}

export class PolarApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'PolarApiError';
    Object.setPrototypeOf(this, PolarApiError.prototype);
  }
}

/** Type guard: narrows an unknown thrown value to a Polar API error. */
export function isPolarApiError(error: unknown): error is PolarApiError {
  return error instanceof PolarApiError;
}

interface RawProductPage {
  items: PolarProductDto[];
  pagination: { total_count: number; max_page: number };
}

export class PolarProductRepository {
  private readonly http: HttpClient;
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: PolarApiConfig, http: HttpClient = new FetchHttpClient()) {
    this.http = http;
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl ?? POLAR_API_BASE_URL;
  }

  /**
   * List products (one page).
   *
   * @param params - Filter + pagination
   * @param options - Transport options (e.g. `signal` for cancellation)
   * @returns A single page of products in domain form
   */
  async list(
    params?: ProductListParams,
    options?: PolarRequestOptions,
  ): Promise<ProductListResponse> {
    const query = new QueryBuilder({
      organization_id: params?.organizationId,
      is_recurring: params?.isRecurring,
      page: params?.page,
      limit: this.clampLimit(params?.limit),
    });
    const url = `${this.baseUrl}/products?${query.toString()}`;

    const response = await this.http.request<RawProductPage>({
      method: 'GET',
      url,
      headers: this.authHeaders(),
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new PolarApiError(
        `Polar API error: ${response.status}`,
        response.status,
        body,
      );
    }

    return mapProductList(response.data);
  }

  /**
   * Fetch a single product by ID, or `null` if Polar returns 404.
   */
  async findById(
    productId: string,
    options?: PolarRequestOptions,
  ): Promise<PolarProduct | null> {
    const url = `${this.baseUrl}/products/${encodeURIComponent(productId)}`;

    const response = await this.http.request<PolarProductDto>({
      method: 'GET',
      url,
      headers: this.authHeaders(),
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      const body = await response.text();
      throw new PolarApiError(
        `Polar API error: ${response.status}`,
        response.status,
        body,
      );
    }

    if (!response.data) {
      throw new PolarApiError(
        'Polar API returned an empty product body',
        response.status,
      );
    }

    return mapProduct(response.data);
  }

  /**
   * Iterate every product matching the filter (auto-paginated).
   *
   * Cancellation: pass an `AbortSignal` to stop early — both between pages
   * and in-flight via the transport.
   */
  iterateAll(
    params?: Omit<ProductListParams, 'page' | 'limit'>,
    options: { limit?: number; signal?: AbortSignal } = {},
  ): AsyncIterable<PolarProduct> {
    const limit = this.clampLimit(options.limit);
    const fetcher: PageFetcher<PolarProduct> = {
      fetchPage: async (page, pageLimit) => {
        const response = await this.list(
          { ...params, page, limit: pageLimit },
          { signal: options.signal },
        );
        const pageData: Page<PolarProduct> = {
          items: response.items,
          page,
          totalCount: response.pagination.totalCount,
          maxPage: response.pagination.maxPage,
          isLast: page >= response.pagination.maxPage,
        };
        return pageData;
      },
    };
    return new PageIterator(fetcher, { limit, signal: options.signal });
  }

  /**
   * Convenience: collect every product into a single array.
   */
  async listAll(
    params?: Omit<ProductListParams, 'page' | 'limit'>,
    options: { limit?: number; signal?: AbortSignal } = {},
  ): Promise<PolarProduct[]> {
    const out: PolarProduct[] = [];
    for await (const product of this.iterateAll(params, options)) {
      out.push(product);
    }
    return out;
  }

  /* ------------------------------------------------------------------ */

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiToken}` };
  }

  private clampLimit(limit: number | undefined): number | undefined {
    return PaginationClamp.pageSize(limit, POLAR_API_MAX_PAGE_SIZE);
  }
}

/* ------------------------------------------------------------------ */
/* Backward-compatible functional API                                 */
/* ------------------------------------------------------------------ */

const defaultClient = new FetchHttpClient();

export async function getProducts(
  config: PolarApiConfig,
  params?: ProductListParams,
  options?: PolarRequestOptions,
): Promise<ProductListResponse> {
  return new PolarProductRepository(config, defaultClient).list(params, options);
}

export async function getProductById(
  config: PolarApiConfig,
  productId: string,
  options?: PolarRequestOptions,
): Promise<PolarProduct | null> {
  return new PolarProductRepository(config, defaultClient).findById(productId, options);
}

export async function getAllProducts(
  config: PolarApiConfig,
  params?: Omit<ProductListParams, 'page' | 'limit'>,
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<PolarProduct[]> {
  return new PolarProductRepository(config, defaultClient).listAll(params, options);
}
