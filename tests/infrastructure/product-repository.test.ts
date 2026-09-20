import { describe, it, expect, vi } from 'vitest';
import {
  PolarProductRepository,
  PolarApiError,
  isPolarApiError,
  getAllProducts,
  getProducts,
} from '../../src/infrastructure/services/polar-product.repository';
import type {
  HttpClient,
  HttpRequest,
  HttpResponse,
} from '../../src/infrastructure/http/http-client';
import type { PolarProductDto } from '../../src/domain/mappers/product.mapper';

function page(items: PolarProductDto[], maxPage = 1, totalCount = items.length) {
  return { items, pagination: { total_count: totalCount, max_page: maxPage } };
}

const dto = (id: string): PolarProductDto => ({
  id,
  name: `Product ${id}`,
  description: null,
  is_recurring: true,
  recurring_interval: 'month',
  is_archived: false,
  organization_id: 'org_1',
  prices: [],
  benefits: [],
  metadata: {},
  created_at: '2026-01-01T00:00:00Z',
  modified_at: null,
});

/** Scriptable fake transport that records every request. */
class FakeHttp implements HttpClient {
  readonly requests: HttpRequest[] = [];
  private next: (req: HttpRequest, call: number) => HttpResponse<unknown> = () => {
    throw new Error('no response scripted');
  };

  respondWith(next: (req: HttpRequest, call: number) => HttpResponse<unknown>): void {
    this.next = next;
  }

  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    this.requests.push(request);
    return this.next(request, this.requests.length) as HttpResponse<T>;
  }

  get urls(): string[] {
    return this.requests.map((r) => r.url);
  }
}

function jsonResponse<T>(data: T, status = 200): HttpResponse<T> {
  return {
    status,
    ok: status >= 200 && status < 300,
    data,
    text: async () => JSON.stringify(data),
  };
}

function emptyResponse(status: number): HttpResponse<null> {
  return { status, ok: false, data: null, text: async () => '' };
}

describe('PolarProductRepository.list', () => {
  it('builds the query from camelCase params', async () => {
    const http = new FakeHttp();
    http.respondWith(() => jsonResponse(page([])));
    const repo = new PolarProductRepository({ apiToken: 'tok' }, http);

    await repo.list({ organizationId: 'org_9', isRecurring: true, page: 2, limit: 50 });

    expect(http.urls[0]).toBe('https://api.polar.sh/v1/products?organization_id=org_9&is_recurring=true&page=2&limit=50');
  });

  it('clamps the limit to Polar hard limits', async () => {
    const http = new FakeHttp();
    http.respondWith(() => jsonResponse(page([])));
    const repo = new PolarProductRepository({ apiToken: 'tok' }, http);

    await repo.list({ limit: 500 });
    await repo.list({ limit: 0 });

    expect(http.urls[0]).toContain('limit=100');
    expect(http.urls[1]).toContain('limit=1');
  });

  it('defaults the limit to the max page size', async () => {
    const http = new FakeHttp();
    http.respondWith(() => jsonResponse(page([])));
    const repo = new PolarProductRepository({ apiToken: 'tok' }, http);

    await repo.list();

    expect(http.urls[0]).toContain('limit=100');
  });

  it('sends the bearer token', async () => {
    const http = new FakeHttp();
    http.respondWith(() => jsonResponse(page([])));
    const repo = new PolarProductRepository({ apiToken: 'secret' }, http);

    await repo.list();

    expect(http.requests[0]?.headers?.Authorization).toBe('Bearer secret');
  });

  it('honors a custom base URL', async () => {
    const http = new FakeHttp();
    http.respondWith(() => jsonResponse(page([])));
    const repo = new PolarProductRepository({ apiToken: 't', baseUrl: 'https://proxy.test/api' }, http);

    await repo.list();

    expect(http.urls[0]).toContain('https://proxy.test/api/products');
  });

  it('maps items to domain entities', async () => {
    const http = new FakeHttp();
    http.respondWith(() => jsonResponse(page([dto('prod_1')])));
    const repo = new PolarProductRepository({ apiToken: 't' }, http);

    const result = await repo.list();

    expect(result.items[0]?.id).toBe('prod_1');
    expect(result.items[0]?.recurringInterval).toBe('monthly');
    expect(result.pagination).toEqual({ totalCount: 1, maxPage: 1 });
  });

  it('maps an absent body to an empty page (no crash)', async () => {
    const http = new FakeHttp();
    http.respondWith(() => jsonResponse(null));
    const repo = new PolarProductRepository({ apiToken: 't' }, http);

    const result = await repo.list();

    expect(result.items).toEqual([]);
    expect(result.pagination).toEqual({ totalCount: 0, maxPage: 1 });
  });

  it('throws PolarApiError with the body for non-2xx responses', async () => {
    const http = new FakeHttp();
    http.respondWith(() => jsonResponse({ error: 'denied' }, 401));
    const repo = new PolarProductRepository({ apiToken: 'bad' }, http);

    const error = await repo.list().catch((e) => e);

    expect(isPolarApiError(error)).toBe(true);
    expect(error).toBeInstanceOf(PolarApiError);
    expect(error.status).toBe(401);
    expect(error.body).toContain('denied');
  });
});

describe('PolarProductRepository.findById', () => {
  it('returns null on 404', async () => {
    const http = new FakeHttp();
    http.respondWith(() => emptyResponse(404));
    const repo = new PolarProductRepository({ apiToken: 't' }, http);

    expect(await repo.findById('prod_missing')).toBeNull();
  });

  it('maps a found product and encodes the id', async () => {
    const http = new FakeHttp();
    http.respondWith(() => jsonResponse(dto('prod_1')));
    const repo = new PolarProductRepository({ apiToken: 't' }, http);

    const product = await repo.findById('prod/1');

    expect(product?.id).toBe('prod_1');
    expect(http.urls[0]).toContain('/products/prod%2F1');
  });

  it('throws PolarApiError when the 2xx body is empty', async () => {
    const http = new FakeHttp();
    http.respondWith(() => jsonResponse(null, 200));
    const repo = new PolarProductRepository({ apiToken: 't' }, http);

    const error = await repo.findById('prod_1').catch((e) => e);

    expect(isPolarApiError(error)).toBe(true);
  });
});

describe('PolarProductRepository.listAll / iterateAll', () => {
  it('collects every page', async () => {
    const http = new FakeHttp();
    http.respondWith((_req, call) =>
      jsonResponse(call === 1 ? page([dto('a'), dto('b')], 2, 3) : page([dto('c')], 2, 3)),
    );
    const repo = new PolarProductRepository({ apiToken: 't' }, http);

    const products = await repo.listAll();

    expect(products.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(http.requests).toHaveLength(2);
  });

  it('stops paginating once the signal aborts', async () => {
    const http = new FakeHttp();
    http.respondWith(() => jsonResponse(page([dto('a'), dto('b')], 5, 10)));
    const repo = new PolarProductRepository({ apiToken: 't' }, http);

    const controller = new AbortController();
    const seen: string[] = [];
    for await (const product of repo.iterateAll(undefined, { signal: controller.signal })) {
      seen.push(product.id);
      controller.abort();
    }

    expect(seen).toEqual(['a']);
    expect(http.requests).toHaveLength(1); // page 2 never requested
  });

  it('passes the signal into the transport', async () => {
    const http = new FakeHttp();
    http.respondWith(() => jsonResponse(page([dto('a')], 1, 1)));
    const repo = new PolarProductRepository({ apiToken: 't' }, http);

    const controller = new AbortController();
    await repo.listAll(undefined, { signal: controller.signal });

    expect(http.requests[0]?.signal).toBe(controller.signal);
  });
});

describe('functional API', () => {
  it('getProducts delegates to the repository', async () => {
    const spy = vi.spyOn(PolarProductRepository.prototype, 'list');
    spy.mockResolvedValue({ items: [], pagination: { totalCount: 0, maxPage: 1 } });

    await getProducts({ apiToken: 't' }, { limit: 10 });

    expect(spy).toHaveBeenCalledWith({ limit: 10 }, undefined);
    spy.mockRestore();
  });

  it('getAllProducts forwards pagination options', async () => {
    const spy = vi.spyOn(PolarProductRepository.prototype, 'listAll');
    spy.mockResolvedValue([]);

    const controller = new AbortController();
    await getAllProducts({ apiToken: 't' }, { isRecurring: true }, { limit: 5, signal: controller.signal });

    expect(spy).toHaveBeenCalledWith(
      { isRecurring: true },
      { limit: 5, signal: controller.signal },
    );
    spy.mockRestore();
  });
});
