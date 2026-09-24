import { desc, inArray } from "drizzle-orm";
import { inquiries } from "@/db/schema";
import type { Db } from "@/db/types";
import { can, roleLabels } from "@/lib/auth/roles";
import { inquiryStatusLabels, type InquiryStatus } from "@/lib/inquiry-constants";
import { logAudit } from "@/lib/server/audit";
import { getInquiryDetail, inquiryDashboardStats, updateInquiry } from "@/lib/server/admin/inquiries";
import { findStaffByTelegram, linkTelegramAccount, unlinkTelegramAccount, type StaffMember } from "@/lib/server/admin/users";
import { HttpError } from "@/lib/server/http";
import { formatInquiryAlert, inquiryActions, inquiryKeyboard, type InquiryAction, type TelegramResult } from "@/lib/server/telegram";
import { toLatinDigits } from "@/lib/text";
import { formatInquiryReference, inquiryTypeLabels } from "@/lib/validation/inquiry";

// The parts of a Telegram update the bot uses.
export type TelegramUser = { id: number; first_name?: string; username?: string };
export type TelegramUpdate = {
  update_id: number;
  message?: { message_id: number; chat: { id: number; type: string }; from?: TelegramUser; text?: string };
  callback_query?: { id: string; from: TelegramUser; data?: string; message?: { message_id: number; chat: { id: number } } };
};

export type BotContext = {
  db: Db;
  /** Calls the Bot API (injected so tests can record calls). */
  api: (method: string, body: Record<string, unknown>) => Promise<TelegramResult>;
  siteUrl: string;
  now?: number;
};

const OPEN_STATUSES: InquiryStatus[] = ["new", "in_progress"];
const LIST_LIMIT = 10;

const HOW_TO_LINK =
  "لربط حسابك: افتح لوحة التحكم ← حسابي ← «ربط تيليجرام»، ثم أرسل هنا الأمر الذي يظهر لك، مثل:\n/link ABCD2345";

function helpText(staff: StaffMember | null): string {
  const lines = ["🤖 بوت طلبات SSPS"];
  if (staff) {
    lines.push(`مرتبط بحساب: ${staff.name} (${roleLabels[staff.role]})`, "");
    if (can(staff.role, "inquiries.view")) {
      lines.push(
        "الأوامر:",
        "/new — الطلبات المفتوحة",
        "/r 12 — عرض طلب برقمه (أو SSPS-000012)",
        "/stats — ملخص الطلبات",
      );
    } else {
      lines.push("صلاحيتك لا تشمل الطلبات، لذلك لن تصلك أوامر الطلبات هنا.");
    }
    lines.push("/unlink — فصل حسابك عن هذا البوت");
  } else {
    lines.push("", HOW_TO_LINK);
  }
  lines.push("", "تنبيهات الطلبات الجديدة تصل مع أزرار: أنا عليه، تم إرسال عرض، إغلاق، مزعج.");
  return lines.join("\n");
}

function parseReference(value: string): number | null {
  const match = /^(?:ssps-)?0*(\d{1,9})$/i.exec(toLatinDigits(value.trim()));
  return match ? Number(match[1]) : null;
}

/** What each button does to a request. */
function changesFor(action: InquiryAction, staff: StaffMember, current: { status: InquiryStatus; assignedTo: number | null }) {
  switch (action) {
    case "take":
      return { assignedTo: staff.id, status: current.status === "new" ? ("in_progress" as const) : current.status };
    case "quoted":
      return { status: "quoted" as const, ...(current.assignedTo ? {} : { assignedTo: staff.id }) };
    case "closed":
      return { status: "closed" as const };
    case "spam":
      return { status: "spam" as const };
    case "reopen":
      return { status: "in_progress" as const };
    default:
      return null;
  }
}

const actionToasts: Partial<Record<InquiryAction, string>> = {
  take: "تم إسناد الطلب إليك",
  quoted: "تم تسجيل إرسال العرض",
  closed: "تم إغلاق الطلب",
  spam: "تم وضع الطلب كمزعج",
  reopen: "تمت إعادة فتح الطلب",
};

async function sendCard(ctx: BotContext, chatId: number, inquiryId: number) {
  const inquiry = await getInquiryDetail(ctx.db, inquiryId);
  await ctx.api("sendMessage", {
    chat_id: chatId,
    text: formatInquiryAlert(inquiry, ctx.siteUrl),
    reply_markup: inquiryKeyboard(inquiry, ctx.siteUrl),
    disable_web_page_preview: true,
  });
}

async function handleCallback(ctx: BotContext, query: NonNullable<TelegramUpdate["callback_query"]>) {
  const answer = (text: string, alert = false) => ctx.api("answerCallbackQuery", { callback_query_id: query.id, text, show_alert: alert });
  const match = /^i:(\d+):([a-z]+)$/.exec(query.data ?? "");
  if (!match || !inquiryActions.includes(match[2] as InquiryAction)) return answer("زر غير معروف.");
  const inquiryId = Number(match[1]);
  const action = match[2] as InquiryAction;

  const staff = await findStaffByTelegram(ctx.db, query.from.id);
  if (!staff) return answer(`حسابك في تيليجرام غير مرتبط بحساب موظف.\n\n${HOW_TO_LINK}`, true);
  const needed = action === "show" ? "inquiries.view" : "inquiries.manage";
  if (!can(staff.role, needed)) return answer("صلاحيتك لا تسمح بهذا الإجراء.", true);

  try {
    if (action === "show") {
      await sendCard(ctx, query.message?.chat.id ?? query.from.id, inquiryId);
      return answer("");
    }
    const current = await getInquiryDetail(ctx.db, inquiryId);
    const changes = changesFor(action, staff, current)!;
    const { before, after } = await updateInquiry(ctx.db, inquiryId, changes, ctx.now);
    const changed = Object.fromEntries(
      (Object.keys(changes) as (keyof typeof changes)[])
        .filter(key => before[key] !== after[key])
        .map(key => [key, { from: before[key], to: after[key] }]),
    );
    if (Object.keys(changed).length) {
      await logAudit(ctx.db, { userId: staff.id, action: "inquiry.update", entity: "inquiry", entityId: inquiryId, details: { ...changed, via: "telegram" } }, ctx.now);
    }
    if (query.message) {
      // Redraw the card for everyone in the chat. "Message is not modified" errors are harmless.
      await ctx.api("editMessageText", {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        text: formatInquiryAlert(after, ctx.siteUrl),
        reply_markup: inquiryKeyboard(after, ctx.siteUrl),
        disable_web_page_preview: true,
      });
    }
    return answer(actionToasts[action] ?? "تم");
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return answer("هذا الطلب لم يعد موجوداً.", true);
    throw error;
  }
}

async function handleMessage(ctx: BotContext, message: NonNullable<TelegramUpdate["message"]>) {
  const text = message.text?.trim() ?? "";
  const reply = (body: string, extra: Record<string, unknown> = {}) =>
    ctx.api("sendMessage", { chat_id: message.chat.id, text: body, disable_web_page_preview: true, ...extra });
  const isPrivate = message.chat.type === "private";
  if (!message.from) return;

  if (!text.startsWith("/")) {
    // In groups, stay quiet about normal conversation; in private chat, show the help.
    if (isPrivate) await reply(helpText(await findStaffByTelegram(ctx.db, message.from.id)));
    return;
  }
  const [rawCommand, ...args] = text.split(/\s+/);
  const command = rawCommand.toLowerCase().replace(/@.*$/, "");

  // "/start CODE" arrives when someone taps the t.me/<bot>?start=CODE link shown in the admin.
  if (command === "/link" || (command === "/start" && args[0])) {
    const linked = args[0] ? await linkTelegramAccount(ctx.db, args[0], message.from.id, ctx.now) : null;
    if (!linked) return reply(`الرمز غير صحيح أو انتهت صلاحيته (10 دقائق).\n\n${HOW_TO_LINK}`);
    await logAudit(ctx.db, { userId: linked.id, action: "telegram.link", entity: "admin_user", entityId: linked.id, details: { telegramUserId: message.from.id } }, ctx.now);
    return reply(`✅ تم ربط حسابك: ${linked.name} (${roleLabels[linked.role]})\n\n${helpText(linked)}`);
  }

  // Setup helper: the ID to use as TELEGRAM_CHAT_ID for alerts. Not secret, so anyone may ask.
  if (command === "/id") {
    return reply(`معرّف هذه المحادثة (TELEGRAM_CHAT_ID):\n${message.chat.id}`);
  }

  const staff = await findStaffByTelegram(ctx.db, message.from.id);
  if (command === "/start" || command === "/help") return reply(helpText(staff));
  if (!staff) return reply(`هذا البوت خاص بفريق SSPS.\n\n${HOW_TO_LINK}`);

  if (command === "/unlink") {
    await unlinkTelegramAccount(ctx.db, staff.id, ctx.now);
    await logAudit(ctx.db, { userId: staff.id, action: "telegram.unlink", entity: "admin_user", entityId: staff.id }, ctx.now);
    return reply("تم فصل حسابك عن هذا البوت. لن تتمكن من استخدام الأزرار حتى تربطه من جديد.");
  }

  if (!can(staff.role, "inquiries.view")) return reply("صلاحيتك لا تشمل الطلبات.");

  if (command === "/new") {
    const open = await ctx.db.select().from(inquiries).where(inArray(inquiries.status, OPEN_STATUSES)).orderBy(desc(inquiries.createdAt), desc(inquiries.id)).limit(LIST_LIMIT);
    if (!open.length) return reply("لا توجد طلبات مفتوحة 🎉");
    const lines = open.map(item => `${formatInquiryReference(item.id)} · ${item.name} · ${inquiryTypeLabels[item.type]} · ${inquiryStatusLabels[item.status]}`);
    return reply(`الطلبات المفتوحة (أحدث ${open.length}):\n\n${lines.join("\n")}\n\nاضغط على طلب لعرضه:`, {
      reply_markup: { inline_keyboard: open.map(item => [{ text: `${formatInquiryReference(item.id)} · ${item.name}`, callback_data: `i:${item.id}:show` }]) },
    });
  }

  if (command === "/r") {
    const id = args[0] ? parseReference(args[0]) : null;
    if (!id) return reply("اكتب رقم الطلب، مثل: /r 12 أو /r SSPS-000012");
    try {
      return await sendCard(ctx, message.chat.id, id);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return reply(`لا يوجد طلب برقم ${formatInquiryReference(id)}.`);
      throw error;
    }
  }

  if (command === "/stats") {
    const stats = await inquiryDashboardStats(ctx.db, ctx.now);
    const count = (status: InquiryStatus) => stats.byStatus[status] ?? 0;
    return reply([
      "📊 ملخص الطلبات",
      `جديدة: ${count("new")}`,
      `قيد المتابعة: ${count("in_progress")}`,
      `تم إرسال عرض: ${count("quoted")}`,
      `مغلقة: ${count("closed")}`,
      `خلال آخر 24 ساعة: ${stats.lastDay}`,
    ].join("\n"));
  }

  return reply(`أمر غير معروف.\n\n${helpText(staff)}`);
}

/** Handles one update from Telegram. Errors are logged, never thrown back to Telegram (it would retry). */
export async function handleTelegramUpdate(ctx: BotContext, update: TelegramUpdate): Promise<void> {
  try {
    if (update.callback_query) await handleCallback(ctx, update.callback_query);
    else if (update.message) await handleMessage(ctx, update.message);
  } catch (error) {
    console.error("[telegram-bot] update failed", update.update_id, error);
    if (update.callback_query) await ctx.api("answerCallbackQuery", { callback_query_id: update.callback_query.id, text: "حدث خطأ، حاول مرة أخرى.", show_alert: true });
  }
}

/** Commands shown in Telegram's menu. */
export const botCommands = [
  { command: "new", description: "الطلبات المفتوحة" },
  { command: "r", description: "عرض طلب برقمه" },
  { command: "stats", description: "ملخص الطلبات" },
  { command: "link", description: "ربط حسابك في لوحة التحكم" },
  { command: "id", description: "معرّف هذه المحادثة" },
  { command: "help", description: "المساعدة" },
];
