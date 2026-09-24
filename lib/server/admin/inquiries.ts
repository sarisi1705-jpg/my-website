import { and, count, desc, eq, gte, isNull, like, lt, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { adminUsers, auditLog, inquiries, type Inquiry } from "@/db/schema";
import type { Db } from "@/db/types";
import { can } from "@/lib/auth/roles";
import { escapeLike } from "@/lib/search/normalize";
import { HttpError } from "@/lib/server/http";
import { toLatinDigits } from "@/lib/text";
import { contactMethodLabels, formatInquiryReference, inquiryTypeLabels } from "@/lib/validation/inquiry";
import type { InquiryListQuery } from "@/lib/validation/admin";
import { inquiryStatusLabels, type InquiryStatus } from "@/lib/inquiry-constants";

export const INQUIRY_PAGE_SIZE = 25;
const EXPORT_LIMIT = 5000;
const DAY = 24 * 60 * 60 * 1000;


export type InquiryRow = Inquiry & { assigneeName: string | null };

const assignee = alias(adminUsers, "assignee");

/** Dates are yyyy-mm-dd in Palestine time (UTC+2/+3); a fixed +3h offset keeps whole days together. */
function dayStart(date: string): number {
  return Date.parse(`${date}T00:00:00+03:00`);
}

function inquiryFilters(query: InquiryListQuery, currentUserId: number): SQL | undefined {
  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(inquiries.status, query.status));
  if (query.type) conditions.push(eq(inquiries.type, query.type));
  if (query.from) conditions.push(gte(inquiries.createdAt, dayStart(query.from)));
  if (query.to) conditions.push(lt(inquiries.createdAt, dayStart(query.to) + DAY));
  if (query.assigned === "me") conditions.push(eq(inquiries.assignedTo, currentUserId));
  else if (query.assigned === "none") conditions.push(isNull(inquiries.assignedTo));
  else if (query.assigned) conditions.push(eq(inquiries.assignedTo, Number(query.assigned)));
  if (query.q) {
    const q = toLatinDigits(query.q.trim());
    const reference = /^(?:ssps-)?0*(\d+)$/i.exec(q);
    const digits = q.replace(/\D/g, "");
    const options: SQL[] = [like(inquiries.name, `%${escapeLike(q)}%`), like(inquiries.email, `%${escapeLike(q.toLowerCase())}%`)];
    if (digits.length >= 4) options.push(like(inquiries.phone, `%${escapeLike(digits)}%`));
    if (reference) options.push(eq(inquiries.id, Number(reference[1])));
    conditions.push(or(...options)!);
  }
  return conditions.length ? and(...conditions) : undefined;
}

function selectInquiries(db: Db) {
  return db
    .select({ inquiry: inquiries, assigneeName: assignee.name })
    .from(inquiries)
    .leftJoin(assignee, eq(inquiries.assignedTo, assignee.id));
}

export async function listInquiries(db: Db, query: InquiryListQuery, currentUserId: number) {
  const where = inquiryFilters(query, currentUserId);
  const [rows, [{ total }]] = await Promise.all([
    selectInquiries(db).where(where).orderBy(desc(inquiries.createdAt), desc(inquiries.id)).limit(INQUIRY_PAGE_SIZE).offset((query.page - 1) * INQUIRY_PAGE_SIZE),
    db.select({ total: count() }).from(inquiries).where(where),
  ]);
  return {
    items: rows.map(row => ({ ...row.inquiry, assigneeName: row.assigneeName })) as InquiryRow[],
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / INQUIRY_PAGE_SIZE)),
  };
}

export async function getInquiryDetail(db: Db, id: number): Promise<InquiryRow> {
  const row = await selectInquiries(db).where(eq(inquiries.id, id)).get();
  if (!row) throw new HttpError(404, "not_found", "الطلب غير موجود.");
  return { ...row.inquiry, assigneeName: row.assigneeName };
}

export async function updateInquiry(
  db: Db,
  id: number,
  input: { status?: InquiryStatus; assignedTo?: number | null; internalNotes?: string },
  now = Date.now(),
): Promise<{ before: InquiryRow; after: InquiryRow }> {
  const before = await getInquiryDetail(db, id);
  if (input.assignedTo) {
    const user = await db.select({ role: adminUsers.role, isActive: adminUsers.isActive }).from(adminUsers).where(eq(adminUsers.id, input.assignedTo)).get();
    if (!user || !user.isActive || !can(user.role, "inquiries.manage")) {
      throw new HttpError(400, "validation_failed", "لا يمكن إسناد الطلب لهذا الحساب.", { assignedTo: "اختر موظفاً فعّالاً من المبيعات أو المالكين" });
    }
  }
  await db.update(inquiries).set({ ...input, updatedAt: now }).where(eq(inquiries.id, id));
  return { before, after: await getInquiryDetail(db, id) };
}

export async function deleteInquiry(db: Db, id: number): Promise<InquiryRow> {
  const existing = await getInquiryDetail(db, id);
  await db.delete(inquiries).where(eq(inquiries.id, id));
  return existing;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Leading =, +, - or @ would run as a formula in Excel: prefix with a quote.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", { timeZone: "Asia/Hebron", hour12: false });
}

/** CSV of matching inquiries (newest first, up to 5000), with a BOM so Excel shows Arabic correctly. */
export async function exportInquiriesCsv(db: Db, query: InquiryListQuery, currentUserId: number): Promise<string> {
  const rows = await selectInquiries(db).where(inquiryFilters(query, currentUserId)).orderBy(desc(inquiries.createdAt)).limit(EXPORT_LIMIT);
  const header = ["رقم الطلب", "التاريخ", "النوع", "الحالة", "الاسم", "الهاتف", "البريد", "الشركة", "طريقة التواصل", "المنتج", "الكمية", "الرسالة", "المسؤول", "ملاحظات داخلية"];
  const lines = rows.map(({ inquiry, assigneeName }) => [
    formatInquiryReference(inquiry.id), formatDate(inquiry.createdAt), inquiryTypeLabels[inquiry.type], inquiryStatusLabels[inquiry.status],
    inquiry.name, inquiry.phone, inquiry.email, inquiry.company, contactMethodLabels[inquiry.preferredContact], inquiry.productSnapshot,
    inquiry.quantity, inquiry.message, assigneeName, inquiry.internalNotes,
  ].map(csvCell).join(","));
  return `﻿${[header.map(csvCell).join(","), ...lines].join("\r\n")}\r\n`;
}

export async function inquiryDashboardStats(db: Db, now = Date.now()) {
  const [byStatus, [{ lastDay }], [{ notNotified }], recent] = await Promise.all([
    db.select({ status: inquiries.status, total: count() }).from(inquiries).groupBy(inquiries.status),
    db.select({ lastDay: count() }).from(inquiries).where(gte(inquiries.createdAt, now - DAY)),
    db.select({ notNotified: count() }).from(inquiries).where(and(isNull(inquiries.notifiedAt), eq(inquiries.status, "new"))),
    selectInquiries(db).orderBy(desc(inquiries.createdAt), desc(inquiries.id)).limit(10),
  ]);
  return {
    byStatus: Object.fromEntries(byStatus.map(row => [row.status, row.total])) as Partial<Record<InquiryStatus, number>>,
    lastDay,
    notNotified,
    recent: recent.map(row => ({ ...row.inquiry, assigneeName: row.assigneeName })) as InquiryRow[],
  };
}

// ── Audit log ──────────────────────────────────────────────────────────────

export const AUDIT_PAGE_SIZE = 50;

export async function listAudit(db: Db, page: number) {
  const actor = alias(adminUsers, "actor");
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ entry: auditLog, actorName: actor.name, actorEmail: actor.email })
      .from(auditLog)
      .leftJoin(actor, eq(auditLog.userId, actor.id))
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(AUDIT_PAGE_SIZE)
      .offset((page - 1) * AUDIT_PAGE_SIZE),
    db.select({ total: count() }).from(auditLog),
  ]);
  return {
    items: rows.map(row => ({ ...row.entry, actorName: row.actorName, actorEmail: row.actorEmail })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
  };
}
