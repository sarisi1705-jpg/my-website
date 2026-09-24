"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ClipboardList, ExternalLink, FolderTree, History, LayoutDashboard, LogOut, Menu, Package, Send, Tags, UserCog, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const icons = { dashboard: LayoutDashboard, inquiries: ClipboardList, products: Package, categories: FolderTree, brands: Tags, users: Users, telegram: Send, audit: History, account: UserCog };
export type NavItem = { href: string; label: string; icon: keyof typeof icons };

export function AdminNav({ items, userName, roleLabel }: { items: NavItem[]; userName: string; roleLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  async function signOut() {
    await fetch("/api/admin/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    window.location.href = "/admin/login";
  }

  return <aside className="admin-sidebar" data-open={open}>
    <div className="admin-sidebar-top">
      <a href="/admin" className="admin-brand"><strong>SSPS</strong><small>لوحة التحكم</small></a>
      <Button variant="ghost" size="icon" className="admin-menu-toggle" aria-label={open ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X /> : <Menu />}</Button>
    </div>
    <nav aria-label="أقسام لوحة التحكم" className="admin-nav">
      {items.map(item => {
        const Icon = icons[item.icon];
        return <a key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined}><Icon aria-hidden="true" />{item.label}</a>;
      })}
    </nav>
    <div className="admin-sidebar-footer">
      <a href="/" target="_blank" rel="noreferrer" className="admin-view-site"><ExternalLink aria-hidden="true" />عرض الموقع</a>
      <div className="admin-user"><strong>{userName}</strong><small>{roleLabel}</small></div>
      <Button variant="outline" size="sm" onClick={signOut}><LogOut />تسجيل الخروج</Button>
    </div>
  </aside>;
}
