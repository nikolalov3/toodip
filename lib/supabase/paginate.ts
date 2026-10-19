import "server-only";

/**
 * PostgREST returns at most 1000 rows per request whatever `.limit()` asks
 * for, and does so silently. Any query that can grow past that must page.
 * `build` returns a fresh query (filters, order) and this walks it in pages
 * until a short page arrives or the ceiling is hit.
 */
export async function fetchAll<T>(
  build: () => {
    range: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  },
  options: { pageSize?: number; max?: number } = {},
): Promise<{ rows: T[]; error: { message: string } | null; truncated: boolean }> {
  const pageSize = Math.min(options.pageSize ?? 1000, 1000);
  const max = options.max ?? 20_000;
  const rows: T[] = [];
  for (let from = 0; from < max; from += pageSize) {
    const page = await build().range(from, from + pageSize - 1);
    if (page.error) return { rows, error: page.error, truncated: false };
    const data = (page.data ?? []) as T[];
    rows.push(...data);
    if (data.length < pageSize) return { rows, error: null, truncated: false };
  }
  return { rows, error: null, truncated: true };
}
