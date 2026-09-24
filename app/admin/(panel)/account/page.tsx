import { PasswordForm } from "@/components/admin/password-form";
import { TelegramLink } from "@/components/admin/telegram-link";
import { getDb } from "@/db";
import { getStaff } from "@/lib/server/admin/users";
import { roleLabels } from "@/lib/auth/roles";
import { requireAdminPage } from "@/lib/server/admin-page";

export default async function AccountPage() {
  const user = await requireAdminPage(undefined, { allowPasswordChange: true });
  const staff = await getStaff(getDb(), user.id);
  return <>
    <header className="admin-page-header"><div><h1>حسابي</h1><p dir="auto">{user.name} · <span dir="ltr">{user.email}</span> · {roleLabels[user.role]}</p></div></header>
    {user.mustChangePassword && <p className="admin-notice admin-notice--warning mb-4">أنت تستخدم كلمة مرور مؤقتة. اختر كلمة مرور جديدة للمتابعة إلى لوحة التحكم.</p>}
    <div className="grid gap-6">
      <PasswordForm required={user.mustChangePassword} />
      {!user.mustChangePassword && <TelegramLink linked={staff.telegramUserId !== null} />}
    </div>
  </>;
}
