"use client";

import { useState } from "react";
import { Loader2, PlugZap, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminApi, ApiError } from "@/lib/admin-api";

export function TelegramActions({ canConnect, canTest }: { canConnect: boolean; canTest: boolean }) {
  const [busy, setBusy] = useState<"connect" | "test" | null>(null);

  async function run(kind: "connect" | "test") {
    setBusy(kind);
    try {
      await adminApi(`/api/admin/telegram/${kind}`, { method: "POST" });
      toast.success(kind === "connect" ? "تم ربط البوت بالموقع" : "تم إرسال رسالة تجريبية");
      if (kind === "connect") window.location.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "تعذّر تنفيذ العملية");
    } finally {
      setBusy(null);
    }
  }

  return <div className="admin-actions">
    <Button onClick={() => run("connect")} disabled={!canConnect || busy !== null}>{busy === "connect" ? <Loader2 className="animate-spin" /> : <PlugZap />}ربط البوت بالموقع</Button>
    <Button variant="outline" onClick={() => run("test")} disabled={!canTest || busy !== null}>{busy === "test" ? <Loader2 className="animate-spin" /> : <Send />}إرسال رسالة تجريبية</Button>
  </div>;
}
