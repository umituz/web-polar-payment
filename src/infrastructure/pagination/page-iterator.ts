/**
 * PageIterator — Iterator pattern over a paginated remote collection.
 *
 * Fetches pages lazily until the upstream reports it has reached the last
 * page. Stops early on cancellation via the `signal` option.
 *
 * The async iterator protocol (`Symbol.asyncIterator`) keeps the consumer
 * code clean: `for await (const item of iterator) { ... }`.
 */

export interface Page<T> {
  items: T[];
  page: number;
  totalCount: number;
  maxPage: number;
  isLast: boolean;
}

export interface PageFetcher<T> {
  fetchPage(page: number, limit: number): Promise<Page<T>>;
}

export interface PageIteratorOptions {
  limit?: number;
  signal?: AbortSignal;
}

export class PageIterator<T> implements AsyncIterable<T> {
  private readonly fetcher: PageFetcher<T>;
  private readonly limit: number;
  private readonly signal?: AbortSignal;

  constructor(fetcher: PageFetcher<T>, options: PageIteratorOptions = {}) {
    this.fetcher = fetcher;
    this.limit = options.limit ?? 100;
    this.signal = options.signal;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    let page = 1;
    while (true) {
      if (this.signal?.aborted) return;
      const current = await this.fetcher.fetchPage(page, this.limit);
      for (const item of current.items) {
        if (this.signal?.aborted) return;
        yield item;
      }
      if (current.isLast || page >= current.maxPage) return;
      page++;
    }
  }
}
