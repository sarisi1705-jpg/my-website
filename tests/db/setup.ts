import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";
import * as schema from "@/db/schema";
import type { Db } from "@/db/types";

const MIGRATIONS_DIR = join(process.cwd(), "drizzle");

/**
 * A fresh in-memory D1 database with every migration in ./drizzle applied,
 * exactly as `wrangler d1 migrations apply` would run them.
 */
export async function createTestDb(): Promise<{ db: Db; d1: D1Database; dispose: () => Promise<void> }> {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({ configPath: "./wrangler.jsonc", persist: false });
  const d1 = proxy.env.DB;
  const files = readdirSync(MIGRATIONS_DIR).filter(name => name.endsWith(".sql")).sort();
  for (const file of files) {
    const statements = readFileSync(join(MIGRATIONS_DIR, file), "utf8")
      .split("--> statement-breakpoint")
      .map(statement => statement.trim())
      .filter(Boolean);
    for (const statement of statements) await d1.prepare(statement).run();
  }
  return { db: drizzle(d1, { schema }), d1, dispose: proxy.dispose };
}
