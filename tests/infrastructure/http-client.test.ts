import { describe, it, expect, vi, afterEach } from 'vitest';
import { FetchHttpClient } from '../../src/infrastructure/http/http-client';

function mockFetchOnce(body: string, init: { status?: number } = {}) {
  const status = init.status ?? 200;
  return vi.fn().mockResolvedValue(
    new Response(body, {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FetchHttpClient', () => {
  it('parses JSON bodies into data', async () => {
    vi.stubGlobal('fetch', mockFetchOnce('{"ok":true}'));
    const response = await new FetchHttpClient().request<{ ok: boolean }>({
      method: 'GET',
      url: 'https://api.polar.sh/v1/products',
    });
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    expect(response.data).toEqual({ ok: true });
  });

  it('reports null data for non-JSON bodies', async () => {
    vi.stubGlobal('fetch', mockFetchOnce('<html>oops</html>'));
    const response = await new FetchHttpClient().request<{ ok: boolean }>({
      method: 'GET',
      url: 'https://api.polar.sh/v1/products',
    });
    expect(response.data).toBeNull();
  });

  it('reports null data for empty bodies', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(''));
    const response = await new FetchHttpClient().request<unknown>({
      method: 'GET',
      url: 'https://api.polar.sh/v1/products',
    });
    expect(response.data).toBeNull();
  });

  it('exposes a repeatable text() accessor', async () => {
    // Regression: the body was previously consumed by json() first, so the
    // error-path text() call always threw "Body has already been consumed".
    const body = '{"error":"denied"}';
    vi.stubGlobal('fetch', mockFetchOnce(body, { status: 403 }));

    const client = new FetchHttpClient();
    const response = await client.request({ method: 'GET', url: 'https://x.test' });
    expect(await response.text()).toBe(body);
    expect(await response.text()).toBe(body); // second call still works
  });

  it('propagates ok/status faithfully', async () => {
    vi.stubGlobal('fetch', mockFetchOnce('{"error":"x"}', { status: 500 }));
    const response = await new FetchHttpClient().request({ method: 'GET', url: 'https://x.test' });
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });

  it('forwards caller aborts to the transport signal', async () => {
    let transportSignal: AbortSignal | null | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            transportSignal = init.signal;
            init.signal?.addEventListener('abort', () => {
              reject(new DOMException('This operation was aborted', 'AbortError'));
            });
          }),
      ),
    );

    const controller = new AbortController();
    const pending = new FetchHttpClient().request({
      method: 'GET',
      url: 'https://x.test',
      signal: controller.signal,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(transportSignal?.aborted).toBe(false);

    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('aborts requests that exceed the timeout budget', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              reject(new DOMException('This operation was aborted', 'AbortError'));
            });
          }),
      ),
    );

    await expect(
      new FetchHttpClient().request({
        method: 'GET',
        url: 'https://x.test',
        timeoutMs: 10,
      }),
    ).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('completes requests that land inside the budget', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            setTimeout(() => resolve(new Response('{}', { status: 200 })), 5);
          }),
      ),
    );

    const response = await new FetchHttpClient().request({
      method: 'GET',
      url: 'https://x.test',
      timeoutMs: 2_000,
    });
    expect(response.ok).toBe(true);
  });

  it('serializes bodies and sets Content-Type', async () => {
    const fetchMock = mockFetchOnce('{}');
    vi.stubGlobal('fetch', fetchMock);

    await new FetchHttpClient().request({
      method: 'POST',
      url: 'https://x.test',
      body: { a: 1 },
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('sends an Accept: application/json header', async () => {
    const fetchMock = mockFetchOnce('{}');
    vi.stubGlobal('fetch', fetchMock);

    await new FetchHttpClient().request({ method: 'GET', url: 'https://x.test' });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>).Accept).toBe('application/json');
  });
});
