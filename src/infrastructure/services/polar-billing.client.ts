/**
 * PolarBillingClient — server-side Polar.sh operations for subscription
 * billing: checkout sessions, the customer portal, and subscription
 * management.
 *
 * Runs wherever `fetch` exists (Node >= 18, Cloudflare Workers, Deno).
 * The access token is an organization-scoped secret and must never reach
 * a public bundle — this class belongs on the server only.
 */

import { POLAR_API_BASE_URL } from '../constants/billing.constants';
import { HttpClient, FetchHttpClient } from '../http/http-client';
import { PolarApiError } from './polar-product.repository';

export const POLAR_SANDBOX_BASE_URL = 'https://sandbox-api.polar.sh/v1';

export interface PolarBillingConfig {
  /** Organization Access Token (OAT) — server-side secret. */
  apiToken: string;
  /** Overrides the API base URL (defaults to production, or sandbox when set). */
  baseUrl?: string;
  /** Uses the isolated Polar sandbox environment. */
  sandbox?: boolean;
  /** Injectable transport for tests. Defaults to `FetchHttpClient`. */
  http?: HttpClient;
}

export interface CheckoutSessionParams {
  productId: string;
  /** Redirect target after payment; Polar substitutes `{CHECKOUT_ID}`. */
  successUrl?: string;
  customerId?: string;
  customerEmail?: string;
  /** Copied onto the resulting order/subscription — how tenants are linked. */
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  url: string;
  status?: string;
  customerId?: string;
  customerEmail?: string;
  subscriptionId?: string | null;
  metadata?: Record<string, string>;
}

export interface PolarSubscriptionRecord {
  id: string;
  status: string;
  productId: string;
  amountCents: number;
  currency: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
  endsAt?: string | null;
  startedAt?: string | null;
  customerId: string;
  metadata: Record<string, string>;
}

export interface PortalSession {
  url: string;
}

interface CheckoutDto {
  id: string;
  url?: string;
  status?: string;
  customer_id?: string | null;
  customer_email?: string | null;
  subscription_id?: string | null;
  metadata?: Record<string, string> | null;
}

interface SubscriptionDto {
  id: string;
  status: string;
  product_id: string;
  amount: number;
  currency: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  canceled_at?: string | null;
  ends_at?: string | null;
  started_at?: string | null;
  customer_id?: string | null;
  metadata?: Record<string, string> | null;
}

interface SubscriptionListDto {
  items?: SubscriptionDto[];
  pagination?: { max_page?: number; current_page?: number; total_count?: number };
}

function resolveBaseUrl(config: PolarBillingConfig): string {
  if (config.baseUrl) return config.baseUrl;
  return config.sandbox ? POLAR_SANDBOX_BASE_URL : POLAR_API_BASE_URL;
}

function mapCheckout(dto: CheckoutDto): CheckoutSession {
  return {
    id: dto.id,
    url: dto.url ?? '',
    status: dto.status,
    customerId: dto.customer_id ?? undefined,
    customerEmail: dto.customer_email ?? undefined,
    subscriptionId: dto.subscription_id ?? null,
    metadata: dto.metadata ?? undefined,
  };
}

function mapSubscription(dto: SubscriptionDto): PolarSubscriptionRecord {
  return {
    id: dto.id,
    status: dto.status,
    productId: dto.product_id,
    amountCents: dto.amount,
    currency: dto.currency,
    currentPeriodStart: dto.current_period_start ?? undefined,
    currentPeriodEnd: dto.current_period_end ?? undefined,
    cancelAtPeriodEnd: dto.cancel_at_period_end,
    canceledAt: dto.canceled_at ?? null,
    endsAt: dto.ends_at ?? null,
    startedAt: dto.started_at ?? undefined,
    customerId: dto.customer_id ?? '',
    metadata: dto.metadata ?? {},
  };
}

export class PolarBillingClient {
  private readonly http: HttpClient;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: PolarBillingConfig) {
    this.http = config.http ?? new FetchHttpClient();
    this.baseUrl = resolveBaseUrl(config).replace(/\/$/, '');
    this.headers = { Authorization: `Bearer ${config.apiToken}` };
  }

  private async request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
    const response = await this.http.request<T>({
      method,
      url: `${this.baseUrl}${path}`,
      headers: this.headers,
      body,
    });
    if (!response.ok) {
      throw new PolarApiError(
        `Polar API ${method} ${path} failed with ${response.status}`,
        response.status,
        await response.text(),
      );
    }
    return (response.data ?? {}) as T;
  }

  async createCheckout(params: CheckoutSessionParams): Promise<CheckoutSession> {
    const dto = await this.request<CheckoutDto>('POST', '/checkouts', {
      product_id: params.productId,
      ...(params.successUrl ? { success_url: params.successUrl } : {}),
      ...(params.customerId ? { customer_id: params.customerId } : {}),
      ...(params.customerEmail ? { customer_email: params.customerEmail } : {}),
      ...(params.metadata ? { metadata: params.metadata } : {}),
    });
    return mapCheckout(dto);
  }

  async getCheckout(id: string): Promise<CheckoutSession> {
    const dto = await this.request<CheckoutDto>('GET', `/checkouts/${encodeURIComponent(id)}`);
    return mapCheckout(dto);
  }

  async createPortalSession(customerId: string, returnUrl?: string): Promise<PortalSession> {
    const dto = await this.request<{ customer_portal_url?: string }>(
      'POST',
      '/customer-sessions',
      {
        customer_id: customerId,
        ...(returnUrl ? { return_url: returnUrl } : {}),
      },
    );
    const url = dto.customer_portal_url;
    if (!url) {
      throw new PolarApiError('Polar customer portal session returned no URL', 500, JSON.stringify(dto));
    }
    return { url };
  }

  async getSubscription(id: string): Promise<PolarSubscriptionRecord> {
    const dto = await this.request<SubscriptionDto>('GET', `/subscriptions/${encodeURIComponent(id)}`);
    return mapSubscription(dto);
  }

  async listSubscriptions(filter: { customerId?: string; productId?: string } = {}): Promise<PolarSubscriptionRecord[]> {
    const query = new URLSearchParams();
    if (filter.customerId) query.set('customer_id', filter.customerId);
    if (filter.productId) query.set('product_id', filter.productId);
    const suffix = query.size > 0 ? `?${query.toString()}` : '';
    const first = await this.request<SubscriptionListDto>('GET', `/subscriptions${suffix}`);
    const records: SubscriptionDto[] = [...(first.items ?? [])];
    const maxPage = typeof first.pagination?.max_page === 'number' ? first.pagination.max_page : 1;
    for (let page = 2; page <= maxPage; page += 1) {
      const next = await this.request<SubscriptionListDto>(
        'GET',
        `/subscriptions${suffix}${suffix ? '&' : '?'}page=${page}`,
      );
      records.push(...(next.items ?? []));
    }
    return records.map(mapSubscription);
  }

  async updateSubscription(
    id: string,
    patch: { cancelAtPeriodEnd?: boolean },
  ): Promise<PolarSubscriptionRecord> {
    const body = patch.cancelAtPeriodEnd !== undefined
      ? { cancel_at_period_end: patch.cancelAtPeriodEnd }
      : undefined;
    const dto = await this.request<SubscriptionDto>(
      'PATCH',
      `/subscriptions/${encodeURIComponent(id)}`,
      body,
    );
    return mapSubscription(dto);
  }
}
