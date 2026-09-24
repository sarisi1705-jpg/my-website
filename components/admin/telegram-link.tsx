"use client";

import { useState } from "react";
import { Link2, Link2Off, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminApi, ApiError } from "@/lib/admin-api";

type LinkCode = { code: string; expiresAt: number; botUsername: string | null };

/** Connects the signed-in staff member's Telegram account to the bot. */
export function TelegramLink({ linked }: { linked: boolean }) {
  const [link, setLink] = useState<LinkCode | null>(null);
  const [busy, setBusy] = useState(false);

  async function createCode() {
    setBusy(true);
    try {
      setLink(await adminApi<LinkCode>("/api/admin/auth/telegram", { method: "POST" }));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "تعذّر إنشاء الرمز");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    try {
      await adminApi("/api/admin/auth/telegram", { method: "DELETE" });
      toast.success("تم فصل تيليجرام");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "تعذّر الفصل");
      setBusy(false);
    }
  }

  return <section className="admin-card admin-form max-w-lg">
    <h2>تيليجرام</h2>
    <p className="text-sm text-[#66758b]">اربط حسابك لتتمكن من التعامل مع الطلبات من أزرار التنبيهات في تيليجرام. كل إجراء يُسجَّل باسمك.</p>
    {linked && !link && <p className="admin-notice admin-notice--info">✅ حسابك مرتبط بتيليجرام.</p>}
    {link && <div className="admin-notice admin-notice--info grid gap-2" role="status">
      {link.botUsername
        ? <>
            <strong>اضغط الزر ثم «Start» في تيليجرام:</strong>
            <Button asChild className="w-fit"><a href={`https://t.me/${link.botUsername}?start=${link.code}`} target="_blank" rel="noreferrer"><Send />فتح @{link.botUsername}</a></Button>
            <small>أو أرسل للبوت: <code dir="ltr">/link {link.code}</code></small>
          </>
        : <>
            <strong>أرسل هذا الأمر إلى بوت SSPS في تيليجرام:</strong>
            <code dir="ltr" className="w-fit rounded bg-white px-3 py-1 text-base font-bold tracking-wider">/link {link.code}</code>
          </>}
      <small>الرمز صالح لمدة 10 دقائق ولمرة واحدة. بعد الربط أعد تحميل هذه الصفحة.</small>
    </div>}
    <div className="admin-actions">
      <Button type="button" variant={linked ? "outline" : "default"} onClick={createCode} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Link2 />}{linked ? "ربط حساب تيليجرام آخر" : "ربط تيليجرام"}</Button>
      {linked && <Button type="button" variant="ghost" className="text-red-600" onClick={unlink} disabled={busy}><Link2Off />فصل</Button>}
    </div>
  </section>;
}
