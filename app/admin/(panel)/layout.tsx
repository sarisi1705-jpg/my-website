import { redirect } from "next/navigation";
import { AdminNav, type NavItem } from "@/components/admin/admin-nav";
import { can, roleLabels, type Capability } from "@/lib/auth/roles";
import { currentAdmin } from "@/lib/server/admin-page";

const nav: (NavItem & { capability?: Capability })[] = [
  { href: "/admin", label: "الرئيسية", icon: "dashboard", capability: "dashboard.view" },
  { href: "/admin/inquiries", label: "الطلبات", icon: "inquiries", capability: "inquiries.view" },
  { href: "/admin/products", label: "المنتجات", icon: "products", capability: "catalog.manage" },
  { href: "/admin/categories", label: "التصنيفات", icon: "categories", capability: "catalog.manage" },
  { href: "/admin/brands", label: "العلامات التجارية", icon: "brands", capability: "catalog.manage" },
  { href: "/admin/users", label: "الموظفون", icon: "users", capability: "users.manage" },
  { href: "/admin/telegram", label: "تيليجرام", icon: "telegram", capability: "settings.manage" },
  { href: "/admin/audit", label: "سجل النشاط", icon: "audit", capability: "audit.view" },
  { href: "/admin/account", label: "حسابي", icon: "account" },
];

export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");
  // Menu items the role can't use are hidden; each page and API route also checks.
  const items = nav.filter(item => !item.capability || can(user.role, item.capability)).map(({ href, label, icon }) => ({ href, label, icon }));
  return <div className="admin-shell">
    <AdminNav items={items} userName={user.name} roleLabel={roleLabels[user.role]} />
    <main className="admin-main">{children}</main>
  </div>;
}
