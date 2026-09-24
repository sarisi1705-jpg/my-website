import { env } from "cloudflare:workers";
import { TelegramActions } from "@/components/admin/telegram-actions";
import { getDb } from "@/db";
import { can, roleLabels } from "@/lib/auth/roles";
import { requireAdminPage } from "@/lib/server/admin-page";
import { listStaff } from "@/lib/server/admin/users";
import { getBotStatus } from "@/lib/server/telegram-setup";

function Check({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return <li className="flex items-start gap-2"><span className={ok ? "text-green-700" : "text-amber-700"} aria-hidden="true">{ok ? "✓" : "○"}</span><span>{label}{!ok && hint && <small className="block text-[#66758b]">{hint}</small>}</span></li>;
}

export default async function TelegramPage() {
  await requireAdminPage("settings.manage");
  const [status, staff] = await Promise.all([getBotStatus(env), listStaff(getDb())]);
  const handlers = staff.filter(member => member.isActive && can(member.role, "inquiries.manage"));

  return <>
    <header className="admin-page-header"><div><h1>تيليجرام</h1><p>تنبيهات الطلبات الجديدة، والتعامل معها من أزرار تيليجرام.</p></div></header>

    <div className="admin-detail-grid">
      <section className="admin-card grid gap-4">
        <h2>حالة الربط</h2>
        <ul className="grid gap-2 text-sm">
          <Check ok={status.configured.token} label="رمز البوت (TELEGRAM_BOT_TOKEN)" hint="من @BotFather، ثم: npx wrangler secret put TELEGRAM_BOT_TOKEN" />
          <Check ok={status.configured.chatId} label="محادثة التنبيهات (TELEGRAM_CHAT_ID)" hint="معرّف مجموعة الفريق أو محادثتك الخاصة" />
          <Check ok={status.configured.webhookSecret} label="السر المشترك (TELEGRAM_WEBHOOK_SECRET)" hint="أي نص عشوائي طويل، مثل: openssl rand -hex 32" />
          <Check ok={Boolean(status.bot)} label={status.bot ? `البوت: @${status.bot.username}` : "الوصول إلى البوت"} hint={status.configured.token ? "رمز البوت غير صحيح أو تيليجرام غير متاح" : undefined} />
          <Check ok={Boolean(status.webhook?.connected)} label="البوت مرتبط بهذا الموقع" hint={status.webhook?.url ? `مرتبط حالياً بعنوان آخر: ${status.webhook.url}` : "اضغط «ربط البوت بالموقع»"} />
        </ul>
        {status.webhook?.lastError && <p className="admin-notice admin-notice--warning">آخر خطأ من تيليجرام: {status.webhook.lastError}</p>}
        {status.webhook && status.webhook.pendingUpdates > 0 && <p className="text-sm text-[#66758b]">رسائل بانتظار المعالجة: {status.webhook.pendingUpdates}</p>}
        <TelegramActions canConnect={status.configured.token && status.configured.webhookSecret && Boolean(status.bot)} canTest={status.configured.token && status.configured.chatId} />
        <p className="text-xs text-[#66758b]">الربط يوجّه رسائل البوت إلى هذا الموقع بدلاً من أي خادم سابق. عنوان الاستقبال: <span dir="ltr">{status.expectedUrl}</span></p>
      </section>

      <section className="admin-card grid gap-3">
        <h2>الموظفون المرتبطون</h2>
        <p className="text-sm text-[#66758b]">فقط من ربط حسابه يستطيع استخدام الأزرار. يربط كل موظف حسابه من صفحة «حسابي».</p>
        {handlers.length ? <ul className="grid gap-2 text-sm">
          {handlers.map(member => <li key={member.id} className="flex items-center justify-between gap-2">
            <span>{member.name} <span className="text-[#66758b]">· {roleLabels[member.role]}</span></span>
            {member.telegramUserId ? <span className="status-badge status-badge--published">مرتبط</span> : <span className="status-badge status-badge--draft">غير مرتبط</span>}
          </li>)}
        </ul> : <p className="admin-empty">لا يوجد موظفون يتعاملون مع الطلبات بعد.</p>}
      </section>
    </div>

    <section className="admin-card mt-6 grid gap-2 text-sm leading-7">
      <h2>الإعداد لأول مرة</h2>
      <ol className="list-decimal pr-5">
        <li>أنشئ بوتاً من @BotFather أو استخدم بوتك الحالي، وانسخ رمزه.</li>
        <li>أضف البوت إلى مجموعة الفريق (أو ابدأ محادثة خاصة معه).</li>
        <li>اضبط الأسرار الثلاثة على Cloudflare، ثم اضغط «ربط البوت بالموقع».</li>
        <li>اضغط «إرسال رسالة تجريبية» للتأكد من وصول التنبيهات.</li>
        <li>يربط كل موظف حسابه من «حسابي ← ربط تيليجرام».</li>
      </ol>
    </section>
  </>;
}
