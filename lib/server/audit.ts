import { auditLog } from "@/db/schema";
import type { Db } from "@/db/types";

export type AuditInput = {
  userId: number | null;
  action: string;
  entity?: string;
  entityId?: string | number;
  details?: Record<string, unknown>;
};

/** Records who changed what. Never throws: a failed audit write must not undo the change itself. */
export async function logAudit(db: Db, entry: AuditInput, now = Date.now()): Promise<void> {
  try {
    await db.insert(auditLog).values({
      userId: entry.userId,
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId === undefined ? null : String(entry.entityId),
      details: entry.details ?? null,
      createdAt: now,
    });
  } catch (error) {
    console.error("[audit] failed to record", entry.action, error);
  }
}
