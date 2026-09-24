import { UserManager } from "@/components/admin/user-manager";
import { getDb } from "@/db";
import { requireAdminPage } from "@/lib/server/admin-page";
import { listStaff } from "@/lib/server/admin/users";

export default async function UsersPage() {
  const user = await requireAdminPage("users.manage");
  const users = await listStaff(getDb());
  return <>
    <header className="admin-page-header"><div><h1>الموظفون</h1><p>من يمكنه الدخول إلى لوحة التحكم وما الذي يستطيع فعله.</p></div></header>
    <UserManager users={users} currentUserId={user.id} />
  </>;
}
