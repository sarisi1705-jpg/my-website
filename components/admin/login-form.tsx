"use client";

import { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi, ApiError } from "@/lib/admin-api";

/** Only same-site paths under /admin are allowed as the post-login destination. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

export function LoginForm({ next }: { next: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await adminApi<{ user: { mustChangePassword: boolean } }>("/api/admin/auth/login", { body: { email, password }, signIn: true });
      window.location.href = user.mustChangePassword ? "/admin/account?required=1" : safeNext(next);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "حدث خطأ غير متوقع.");
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-4" noValidate>
    <div className="grid gap-2">
      <Label htmlFor="email">البريد الإلكتروني</Label>
      <Input id="email" type="email" dir="ltr" className="text-right" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} />
    </div>
    <div className="grid gap-2">
      <Label htmlFor="password">كلمة المرور</Label>
      <Input id="password" type="password" dir="ltr" className="text-right" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <Button type="submit" size="lg" disabled={busy} className="bg-[#1258dc]">{busy ? <Loader2 className="animate-spin" /> : <LogIn />}تسجيل الدخول</Button>
  </form>;
}
