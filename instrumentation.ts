/**
 * Server start hook. With FETCH_TRACE=1 every outbound fetch is logged with
 * its duration and host/path, so a slow page can be read as a list of the
 * network calls it made. Off by default: zero cost in production.
 */
export async function register() {
  if (process.env.FETCH_TRACE !== "1" || process.env.NEXT_RUNTIME !== "nodejs") return;
  const original = globalThis.fetch;
  globalThis.fetch = async function tracedFetch(input, init) {
    const started = Date.now();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    try {
      return await original(input, init);
    } finally {
      let label = url;
      try {
        const u = new URL(url);
        label = `${u.host}${u.pathname}${u.search ? "?" + u.search.slice(1, 60) : ""}`;
      } catch {
        /* keep raw */
      }
      console.log(`[fetch] ${String(Date.now() - started).padStart(4)}ms ${init?.method ?? "GET"} ${label}`);
    }
  } as typeof fetch;
}
