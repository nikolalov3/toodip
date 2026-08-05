import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { SEED_VERSION, type DemoDataset } from "@/lib/demo/dataset";
import { buildSeedDataset } from "@/lib/demo/seed";

/**
 * Session scoped storage for the demo workspace.
 *
 * Two drivers, picked automatically:
 *   file    persists to .demo-data/<session>.json, used in local development so
 *           approvals and drafts survive a restart of the dev server.
 *   memory  a per instance map, used on serverless hosting where the filesystem
 *           is read only. Data lives as long as the instance stays warm, which
 *           is enough for a demo, and the UI says so out loud.
 *
 * Neither driver is the product. Both disappear the moment the Supabase adapter
 * is switched on in lib/repositories/index.ts.
 */

type Driver = "file" | "memory";

const DATA_DIR = path.join(process.cwd(), ".demo-data");

function resolveDriver(): Driver {
  const configured = process.env.DEMO_STORE_DRIVER;
  if (configured === "file" || configured === "memory") return configured;
  // Vercel and most serverless runtimes ship a read only filesystem.
  return process.env.VERCEL ? "memory" : "file";
}

export const demoStoreDriver: Driver = resolveDriver();

const globalForDemo = globalThis as unknown as {
  __rraDemoStore?: Map<string, DemoDataset>;
};

const memoryStore: Map<string, DemoDataset> = (globalForDemo.__rraDemoStore ??=
  new Map());

function filePath(sessionId: string): string {
  const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(DATA_DIR, `${safe}.json`);
}

async function readFromDisk(sessionId: string): Promise<DemoDataset | null> {
  try {
    const raw = await fs.readFile(filePath(sessionId), "utf8");
    return JSON.parse(raw) as DemoDataset;
  } catch {
    return null;
  }
}

async function writeToDisk(
  sessionId: string,
  dataset: DemoDataset,
): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      filePath(sessionId),
      JSON.stringify(dataset, null, 2),
      "utf8",
    );
  } catch {
    // A read only filesystem is not an error worth failing a request over.
    // The in memory copy stays authoritative for this instance.
  }
}

export async function readDataset(sessionId: string): Promise<DemoDataset> {
  const cached = memoryStore.get(sessionId);
  if (cached?.version === SEED_VERSION) return cached;

  if (demoStoreDriver === "file") {
    const fromDisk = await readFromDisk(sessionId);
    if (fromDisk?.version === SEED_VERSION) {
      memoryStore.set(sessionId, fromDisk);
      return fromDisk;
    }
  }

  const seeded = buildSeedDataset();
  memoryStore.set(sessionId, seeded);
  if (demoStoreDriver === "file") await writeToDisk(sessionId, seeded);
  return seeded;
}

/** Reads, mutates in place and persists. Returns whatever the mutator returns. */
export async function mutateDataset<T>(
  sessionId: string,
  mutator: (dataset: DemoDataset) => T,
): Promise<T> {
  const dataset = await readDataset(sessionId);
  const result = mutator(dataset);
  memoryStore.set(sessionId, dataset);
  if (demoStoreDriver === "file") await writeToDisk(sessionId, dataset);
  return result;
}

export async function resetDataset(sessionId: string): Promise<void> {
  const seeded = buildSeedDataset();
  memoryStore.set(sessionId, seeded);
  if (demoStoreDriver === "file") await writeToDisk(sessionId, seeded);
}
