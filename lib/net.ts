import "server-only";

import { isIP } from "node:net";
import { promises as dns } from "node:dns";

/**
 * Is this hostname safe for the server to fetch on a user's behalf? Resolves
 * it and refuses anything that lands on loopback, link-local, private or
 * reserved space, which is where cloud metadata endpoints and internal
 * services live. A name that does not resolve is refused too.
 */
export async function isPublicHost(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return false;
  }
  const addresses: string[] = [];
  if (isIP(host)) addresses.push(host);
  else {
    try {
      const records = await dns.lookup(host, { all: true });
      for (const record of records) addresses.push(record.address);
    } catch {
      return false;
    }
  }
  if (addresses.length === 0) return false;
  return addresses.every((address) => !isPrivateAddress(address));
}

export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = address.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") ||
    v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb");
}
