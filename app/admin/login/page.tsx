import { redirect } from "next/navigation";
import { Printer } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { currentAdmin } from "@/lib/server/admin-page";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await currentAdmin()) redirect("/admin");
  const next = (await searchParams).next;
  return <main className="grid min-h-screen place-items-center px-4 py-12">
    <div className="w-full max-w-sm rounded-2xl border border-[#dce6f2] bg-white p-8 shadow-[0_20px_50px_#15366a14]">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-[#1258dc] text-white"><Printer aria-hidden="true" /></span>
        <div><h1 className="text-xl font-extrabold">لوحة تحكم SSPS</h1><p className="text-sm text-[#66758b]">سجّل الدخول للمتابعة</p></div>
      </div>
      <LoginForm next={typeof next === "string" ? next : null} />
    </div>
  </main>;
}
