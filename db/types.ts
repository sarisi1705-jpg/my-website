import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "./schema";

/** The app's database handle. Repository functions take it as an argument so tests can pass their own. */
export type Db = DrizzleD1Database<typeof schema>;
