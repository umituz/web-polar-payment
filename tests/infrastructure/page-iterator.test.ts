import { describe, it, expect } from 'vitest';
import {
  PageIterator,
  type Page,
  type PageFetcher,
} from '../../src/infrastructure/pagination/page-iterator';

function pagesFetcher(pages: Array<Partial<Page<number>>>): PageFetcher<number> & {
  requestedPages: number[];
} {
  const requestedPages: number[] = [];
  return {
    requestedPages,
    async fetchPage(page: number, _limit: number): Promise<Page<number>> {
      requestedPages.push(page);
      const current = pages[page - 1] ?? { items: [] };
      return {
        items: current.items ?? [],
        page,
        totalCount: current.totalCount ?? 0,
        maxPage: current.maxPage ?? 1,
        isLast: current.isLast ?? page >= (current.maxPage ?? 1),
      };
    },
  };
}

describe('PageIterator', () => {
  it('yields every item across all pages', async () => {
    const fetcher = pagesFetcher([
      { items: [1, 2], maxPage: 3, totalCount: 5 },
      { items: [3, 4], maxPage: 3, totalCount: 5 },
      { items: [5], maxPage: 3, totalCount: 5 },
    ]);

    const collected: number[] = [];
    for await (const item of new PageIterator<number>(fetcher)) {
      collected.push(item);
    }

    expect(collected).toEqual([1, 2, 3, 4, 5]);
    expect(fetcher.requestedPages).toEqual([1, 2, 3]);
  });

  it('stops when the fetcher reports isLast', async () => {
    const fetcher = pagesFetcher([{ items: [1], isLast: true, maxPage: 9 }]);

    const collected: number[] = [];
    for await (const item of new PageIterator<number>(fetcher)) {
      collected.push(item);
    }

    expect(collected).toEqual([1]);
    expect(fetcher.requestedPages).toEqual([1]);
  });

  it('stops requesting further pages once aborted', async () => {
    const fetcher = pagesFetcher([
      { items: [1, 2], maxPage: 3 },
      { items: [3], maxPage: 3 },
      { items: [4], maxPage: 3 },
    ]);
    const controller = new AbortController();

    const collected: number[] = [];
    for await (const item of new PageIterator<number>(fetcher, {
      signal: controller.signal,
    })) {
      collected.push(item);
      if (collected.length === 3) controller.abort(); // mid-page-2
    }

    expect(collected).toEqual([1, 2, 3]);
    expect(fetcher.requestedPages).toEqual([1, 2]); // page 3 never requested
  });

  it('yields nothing when already aborted', async () => {
    const fetcher = pagesFetcher([{ items: [1] }]);
    const controller = new AbortController();
    controller.abort();

    const collected: number[] = [];
    for await (const item of new PageIterator<number>(fetcher, {
      signal: controller.signal,
    })) {
      collected.push(item);
    }

    expect(collected).toEqual([]);
    expect(fetcher.requestedPages).toEqual([]);
  });

  it('forwards the limit to the fetcher', async () => {
    const limits: number[] = [];
    const fetcher: PageFetcher<number> = {
      async fetchPage(_page, limit) {
        limits.push(limit);
        return { items: [], page: 1, totalCount: 0, maxPage: 1, isLast: true };
      },
    };

    for await (const _ of new PageIterator<number>(fetcher, { limit: 7 })) {
      // drain
    }

    expect(limits).toEqual([7]);
  });
});
