import "server-only";

import { createSign } from "node:crypto";

/**
 * Google Search Console through a service account. The venue adds the
 * service account's e-mail as a user of its property (Restricted is enough),
 * toodip reads the Search Analytics report. No OAuth screens, no Google app
 * verification; the key lives in the environment, never in the database.
 *
 * GSC_SERVICE_ACCOUNT_JSON  the whole key file as one line, or
 * GSC_SERVICE_ACCOUNT_EMAIL + GSC_SERVICE_ACCOUNT_KEY (PEM, "\n" escaped).
 */

interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
}

export function serviceAccount(): ServiceAccount | null {
  const json = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json) as { client_email?: string; private_key?: string };
      if (parsed.client_email && parsed.private_key) {
        return { clientEmail: parsed.client_email, privateKey: parsed.private_key.replace(/\\n/g, "\n") };
      }
    } catch {
      /* fall through to the split variables */
    }
  }
  const email = process.env.GSC_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GSC_SERVICE_ACCOUNT_KEY?.trim();
  if (email && key) return { clientEmail: email, privateKey: key.replace(/\\n/g, "\n") };
  return null;
}

export function gscConfigured(): boolean {
  return serviceAccount() !== null;
}

/** The e-mail the venue has to add in Search Console, for the instructions. */
export function gscServiceEmail(): string | null {
  return serviceAccount()?.clientEmail ?? null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/** A short-lived access token from a signed JWT, cached for its lifetime. */
async function accessToken(): Promise<string> {
  const account = serviceAccount();
  if (!account) throw new Error("No Search Console service account configured (GSC_SERVICE_ACCOUNT_JSON).");
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = base64url(signer.sign(account.privateKey));

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Google token ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export interface SearchAnalyticsRow {
  day: string;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  position: number;
}

/**
 * Day x query x page rows for a property and a date range, paged through
 * Google's 25 000-row limit. Dates are inclusive, YYYY-MM-DD, in the
 * property's time zone as Google reports them.
 */
export async function searchAnalytics(siteUrl: string, startDate: string, endDate: string): Promise<SearchAnalyticsRow[]> {
  const token = await accessToken();
  const rows: SearchAnalyticsRow[] = [];
  const rowLimit = 25_000;
  for (let startRow = 0; ; startRow += rowLimit) {
    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["date", "query", "page"],
          rowLimit,
          startRow,
          dataState: "final",
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!response.ok) throw new Error(`Search Console ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const data = (await response.json()) as {
      rows?: Array<{ keys: string[]; clicks: number; impressions: number; position: number }>;
    };
    const page = data.rows ?? [];
    for (const row of page) {
      rows.push({
        day: row.keys[0],
        query: row.keys[1],
        page: row.keys[2],
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
      });
    }
    if (page.length < rowLimit) break;
  }
  return rows;
}

/** Lists the properties the service account can read, to confirm access after the venue added it. */
export async function listSites(): Promise<string[]> {
  const token = await accessToken();
  const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Search Console ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const data = (await response.json()) as { siteEntry?: Array<{ siteUrl: string }> };
  return (data.siteEntry ?? []).map((s) => s.siteUrl);
}
