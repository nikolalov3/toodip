#!/usr/bin/env node
/**
 * Imports a Profound raw-responses export as the visibility baseline.
 *
 * Usage:
 *   node scripts/import-visibility-baseline.mjs --tenant <slug> [--file <path>]
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Idempotent: re-running replaces previously imported Profound rows for the
 * same tenant and dates instead of duplicating them.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readEnvLocal() {
  const env = {};
  try {
    for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) env[match[1]] = match[2].trim();
    }
  } catch {
    /* fall through to process.env */
  }
  return { ...env, ...process.env };
}

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : fallback;
}

const PLATFORMS = {
  ChatGPT: "chatgpt",
  "Google AI Overviews": "google_aio",
  Perplexity: "perplexity",
};

const isPolish = (text) =>
  /[ąćęłńóśźż]/i.test(text) || /\b(gdzie|któr|jaka|najlepsz|kawiarni)/i.test(text);

async function main() {
  const env = readEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const filePath = resolve(
    arg("file", join(process.env.HOME ?? "", "Desktop/profound_raw_data_with_citations.json")),
  );
  const ownPattern = new RegExp(arg("own", "bruk"), "i");
  const payload = JSON.parse(readFileSync(filePath, "utf8"));
  const rows = payload.data ?? [];
  if (rows.length === 0) {
    console.error("The export contains no rows.");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Resolve the tenant. With exactly one non-platform workspace, use it.
  const tenants = await supabase.from("tenants").select("id, name, slug");
  if (tenants.error) throw new Error(tenants.error.message);
  const candidates = tenants.data.filter((t) => t.slug !== "platform");
  const slug = arg("tenant");
  const tenant = slug
    ? tenants.data.find((t) => t.slug === slug)
    : candidates.length === 1
      ? candidates[0]
      : null;
  if (!tenant) {
    console.error("Pick a workspace with --tenant <slug>. Available:");
    for (const t of tenants.data) console.error(`  ${t.slug}  (${t.name})`);
    process.exit(1);
  }
  console.log(`Importing into workspace: ${tenant.name} (${tenant.slug})`);

  // Idempotency: clear earlier Profound imports for the dates in this file.
  const dates = [...new Set(rows.map((r) => r.date).filter(Boolean))];
  const cleared = await supabase
    .from("visibility_runs")
    .delete()
    .eq("tenant_id", tenant.id)
    .eq("source", "profound")
    .in("executed_on", dates);
  if (cleared.error) throw new Error(`Clearing old import: ${cleared.error.message}`);

  // Intents and prompts, upserted.
  const intentIds = new Map();
  const promptIds = new Map();

  for (const row of rows) {
    if (!intentIds.has(row.topic)) {
      const isBranded = ownPattern.test(row.topic);
      const upserted = await supabase
        .from("intents")
        .upsert(
          {
            tenant_id: tenant.id,
            name: row.topic,
            language: isPolish(row.prompt ?? "") ? "pl" : "en",
            is_branded: isBranded,
          },
          { onConflict: "tenant_id,name" },
        )
        .select("id")
        .single();
      if (upserted.error) throw new Error(`Intent "${row.topic}": ${upserted.error.message}`);
      intentIds.set(row.topic, upserted.data.id);
    }

    if (!promptIds.has(row.prompt)) {
      const upserted = await supabase
        .from("visibility_prompts")
        .upsert(
          {
            tenant_id: tenant.id,
            intent_id: intentIds.get(row.topic),
            text: row.prompt,
            language: isPolish(row.prompt ?? "") ? "pl" : "en",
          },
          { onConflict: "tenant_id,text" },
        )
        .select("id")
        .single();
      if (upserted.error) throw new Error(`Prompt: ${upserted.error.message}`);
      promptIds.set(row.prompt, upserted.data.id);
    }
  }

  // Runs with mentions and citations.
  let runCount = 0;
  let mentionCount = 0;
  let citationCount = 0;

  for (const row of rows) {
    const run = await supabase
      .from("visibility_runs")
      .insert({
        tenant_id: tenant.id,
        prompt_id: promptIds.get(row.prompt),
        platform: PLATFORMS[row.platform] ?? "other",
        source: "profound",
        executed_on: row.date,
        response_text: row.response ?? null,
        raw: {
          run_id: row.run_id ?? null,
          search_queries: row.search_queries ?? null,
          mentioned: row["mentioned?"] ?? null,
          region: row.region ?? null,
        },
      })
      .select("id")
      .single();
    if (run.error) throw new Error(`Run: ${run.error.message}`);
    runCount += 1;

    const mentions = String(row.mentions ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name, index) => ({
        run_id: run.data.id,
        name,
        is_own: ownPattern.test(name),
        position: index + 1,
      }));
    if (mentions.length) {
      const inserted = await supabase.from("visibility_mentions").insert(mentions);
      if (inserted.error) throw new Error(`Mentions: ${inserted.error.message}`);
      mentionCount += mentions.length;
    }

    const citations = Object.keys(row)
      .filter((k) => k.startsWith("citation_") && typeof row[k] === "string" && row[k].startsWith("http"))
      .map((k, index) => {
        try {
          return {
            run_id: run.data.id,
            url: row[k],
            domain: new URL(row[k]).hostname.replace(/^www\./, ""),
            rank: index + 1,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (citations.length) {
      const inserted = await supabase.from("visibility_citations").insert(citations);
      if (inserted.error) throw new Error(`Citations: ${inserted.error.message}`);
      citationCount += citations.length;
    }
  }

  console.log(
    `Done: ${intentIds.size} intents, ${promptIds.size} prompts, ${runCount} runs, ${mentionCount} mentions, ${citationCount} citations.`,
  );
  console.log("Baseline dates:", dates.join(", "));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
