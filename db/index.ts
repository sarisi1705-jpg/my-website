import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { Db } from "./types";

export type { Db } from "./types";

export function getDb(): Db {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Check the d1_databases entry in wrangler.jsonc."
    );
  }

  return drizzle(env.DB, { schema });
}
