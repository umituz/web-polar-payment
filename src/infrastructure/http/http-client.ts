/**
 * HttpClient — minimal Strategy contract.
 *
 * The Polar product service depends on this interface, not on `fetch`, so the
 * transport can be swapped (fetch / undici / node http) or mocked without
 * changing the calling code.
 */

export interface HttpRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** Aborts the underlying transport when fired. */
  signal?: AbortSignal;
}

export interface HttpResponse<T> {
  status: number;
  ok: boolean;
  /** Parsed JSON body, or `null` when the body was empty / not JSON. */
  data: T | null;
  text(): Promise<string>;
}

export interface HttpClient {
  request<T>(request: HttpRequest): Promise<HttpResponse<T>>;
}

/**
 * `fetch`-based implementation. Returns a typed response envelope that hides
 * the raw `Response` lifecycle from callers.
 *
 * The body is read once as text and reused for both JSON parsing and the
 * `text()` accessor — a `Response` body can only be consumed a single time.
 */
export class FetchHttpClient implements HttpClient {
  async request<T>(request: HttpRequest): Promise<HttpResponse<T>> {
    const init: RequestInit = {
      method: request.method,
      headers: {
        Accept: 'application/json',
        ...(request.headers ?? {}),
      },
      signal: request.signal,
    };
    if (request.body !== undefined) {
      (init as RequestInit & { body: string }).body = JSON.stringify(request.body);
      (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    const response = await fetch(request.url, init);
    const bodyText = await response.text();

    let data: T | null = null;
    if (bodyText.length > 0) {
      try {
        data = JSON.parse(bodyText) as T;
      } catch {
        data = null;
      }
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
      text: async () => bodyText,
    };
  }
}
