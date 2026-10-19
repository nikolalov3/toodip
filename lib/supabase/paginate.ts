import "server-only";

/**
 * PostgREST returns at most 1000 rows per request whatever `.limit()` asks
 * for, and does so silently. Any query that can grow past that must page.
 * `build` returns a fresh query (filters, order) and this walks it in pages
 * until a short page arrives or the ceiling is hit.
 */
export async function fetchAll<T>(
  build: () => {
    range: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null; count?: number | null }>;
  },
  options: { pageSize?: number; max?: number } = {},
): Promise<{ rows: T[]; error: { message: string } | null; truncated: boolean }> {
  const pageSize = Math.min(options.pageSize ?? 1000, 1000);
  const max = options.max ?? 20_000;
  const first = await build().range(0, pageSize - 1);
  if (first.error) return { rows: [], error: first.error, truncated: false };
  const rows = [...((first.data ?? []) as T[])];
  if (rows.length < pageSize) return { rows, error: null, truncated: false };

  // When the first page is full, the rest is fetched at once rather than one
  // page after another: wall time stays one round trip, not N.
  const total = typeof first.count === "number" ? first.count : null;
  const lastIndex = Math.min(total ?? max, max) - 1;
  const starts: number[] = [];
  for (let from = pageSize; from <= lastIndex; from += pageSize) starts.push(from);
  if (total === null) {
    // No count available: walk sequentially until a short page.
    for (let from = pageSize; from < max; from += pageSize) {
      const page = await build().range(from, from + pageSize - 1);
      if (page.error) return { rows, error: page.error, truncated: false };
      const data = (page.data ?? []) as T[];
      rows.push(...data);
      if (data.length < pageSize) return { rows, error: null, truncated: false };
    }
    return { rows, error: null, truncated: true };
  }
  const pages = await Promise.all(starts.map((from) => build().range(from, from + pageSize - 1)));
  for (const page of pages) {
    if (page.error) return { rows, error: page.error, truncated: false };
    rows.push(...((page.data ?? []) as T[]));
  }
  return { rows, error: null, truncated: (total ?? 0) > max };
}
