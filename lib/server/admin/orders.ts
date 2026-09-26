import { and, count, desc, eq, gte, isNull, like, lt, ne, or, sum, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { adminUsers, orders, type Order } from "@/db/schema";
import type { Db } from "@/db/types";
import { can } from "@/lib/auth/roles";
import type { OrderStatus, PaymentStatus } from "@/lib/order-constants";
import { escapeLike } from "@/lib/search/normalize";
import { HttpError } from "@/lib/server/http";
import { toLatinDigits } from "@/lib/text";
import type { OrderListQuery } from "@/lib/validation/admin";

export const ORDER_PAGE_SIZE = 25;
const DAY = 24 * 60 * 60 * 1000;

export type OrderRow = Order & { assigneeName: string | null };

const assignee = alias(adminUsers, "assignee");

/** Dates are yyyy-mm-dd in Palestine time (UTC+2/+3); a fixed +3h offset keeps whole days together. */
function dayStart(date: string): number {
  return Date.parse(`${date}T00:00:00+03:00`);
}

function orderFilters(query: OrderListQuery): SQL | undefined {
  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(orders.status, query.status));
  if (query.paymentStatus) conditions.push(eq(orders.paymentStatus, query.paymentStatus));
  if (query.from) conditions.push(gte(orders.createdAt, dayStart(query.from)));
  if (query.to) conditions.push(lt(orders.createdAt, dayStart(query.to) + DAY));
  if (query.q) {
    const q = toLatinDigits(query.q.trim());
    const reference = /^(?:ord-)?0*(\d+)$/i.exec(q);
    const digits = q.replace(/\D/g, "");
    const options: SQL[] = [like(orders.name, `%${escapeLike(q)}%`), like(orders.email, `%${escapeLike(q.toLowerCase())}%`)];
    if (digits.length >= 4) options.push(like(orders.phone, `%${escapeLike(digits)}%`));
    if (reference) options.push(eq(orders.id, Number(reference[1])));
    conditions.push(or(...options)!);
  }
  return conditions.length ? and(...conditions) : undefined;
}

function selectOrders(db: Db) {
  return db.select({ order: orders, assigneeName: assignee.name }).from(orders).leftJoin(assignee, eq(orders.assignedTo, assignee.id));
}

const toRow = (row: { order: Order; assigneeName: string | null }): OrderRow => ({ ...row.order, assigneeName: row.assigneeName });

export async function listOrders(db: Db, query: OrderListQuery) {
  const where = orderFilters(query);
  const [rows, [{ total }]] = await Promise.all([
    selectOrders(db).where(where).orderBy(desc(orders.createdAt), desc(orders.id)).limit(ORDER_PAGE_SIZE).offset((query.page - 1) * ORDER_PAGE_SIZE),
    db.select({ total: count() }).from(orders).where(where),
  ]);
  return { items: rows.map(toRow), total, page: query.page, pageCount: Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE)) };
}

export async function getOrderDetail(db: Db, id: number): Promise<OrderRow> {
  const row = await selectOrders(db).where(eq(orders.id, id)).get();
  if (!row) throw new HttpError(404, "not_found", "الطلب غير موجود.");
  return toRow(row);
}

export async function updateOrder(
  db: Db,
  id: number,
  input: { status?: OrderStatus; paymentStatus?: PaymentStatus; assignedTo?: number | null; internalNotes?: string },
  now = Date.now(),
): Promise<{ before: OrderRow; after: OrderRow }> {
  const before = await getOrderDetail(db, id);
  if (input.assignedTo) {
    const user = await db.select({ role: adminUsers.role, isActive: adminUsers.isActive }).from(adminUsers).where(eq(adminUsers.id, input.assignedTo)).get();
    if (!user || !user.isActive || !can(user.role, "orders.manage")) {
      throw new HttpError(400, "validation_failed", "لا يمكن إسناد الطلب لهذا الحساب.", { assignedTo: "اختر موظفاً فعّالاً من المبيعات أو المالكين" });
    }
  }
  await db.update(orders).set({ ...input, updatedAt: now }).where(eq(orders.id, id));
  return { before, after: await getOrderDetail(db, id) };
}

export async function orderDashboardStats(db: Db, now = Date.now()) {
  const [byStatus, [{ lastDay }], [{ notNotified }], [{ revenue30 }], recent] = await Promise.all([
    db.select({ status: orders.status, total: count() }).from(orders).groupBy(orders.status),
    db.select({ lastDay: count() }).from(orders).where(gte(orders.createdAt, now - DAY)),
    db.select({ notNotified: count() }).from(orders).where(and(isNull(orders.notifiedAt), eq(orders.status, "new"))),
    // Last 30 days, not counting cancelled orders.
    db.select({ revenue30: sum(orders.totalMinor).mapWith(Number) }).from(orders).where(and(gte(orders.createdAt, now - 30 * DAY), ne(orders.status, "cancelled"))),
    selectOrders(db).orderBy(desc(orders.createdAt), desc(orders.id)).limit(5),
  ]);
  return {
    byStatus: Object.fromEntries(byStatus.map(row => [row.status, row.total])) as Partial<Record<OrderStatus, number>>,
    lastDay,
    notNotified,
    revenue30: revenue30 ?? 0,
    recent: recent.map(toRow),
  };
}
