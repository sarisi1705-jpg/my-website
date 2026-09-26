"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronLeft, Menu, Phone, Printer, X } from "lucide-react";
import { CartLink } from "@/components/cart-link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

export type SitePage = "home" | "products" | "services" | "offers" | "about" | "contact";

export type HeaderCategory = { slug: string; name: string; description: string };

function activePage(pathname: string): SitePage | undefined {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/product") || pathname.startsWith("/categories")) return "products";
  const key = pathname.split("/")[1] as SitePage;
  return ["services", "offers", "about", "contact"].includes(key) ? key : undefined;
}

const navigation: { key: SitePage; label: string; href: string }[] = [
  { key: "home", label: "الرئيسية", href: "/" },
  { key: "services", label: "خدماتنا", href: "/services" },
  { key: "offers", label: "العروض", href: "/offers" },
  { key: "about", label: "من نحن", href: "/about" },
  { key: "contact", label: "تواصل معنا", href: "/contact" },
];

function ProductsMenu({ categories, mobile = false, active = false, onNavigate }: { categories: HeaderCategory[]; mobile?: boolean; active?: boolean; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const triggerClass = mobile
    ? `mobile-products-trigger${active ? " mobile-nav--active" : ""}`
    : `nav-link products-trigger${active ? " nav-link--active" : ""}`;

  return <div className={`products-menu${mobile ? " products-menu--mobile" : ""}`} ref={menuRef}>
    <button type="button" className={triggerClass} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(current => !current)}>
      المنتجات <ChevronDown aria-hidden="true" />
    </button>
    {open && <div className="products-dropdown" role="menu" aria-label="أقسام المنتجات">
      {categories.map(category => <a key={category.slug} href={`/products/${category.slug}`} role="menuitem" onClick={onNavigate}>
        <span><strong>{category.name}</strong><small>{category.description}</small></span><ChevronLeft aria-hidden="true" />
      </a>)}
    </div>}
  </div>;
}

export function SiteHeaderNav({ categories }: { categories: HeaderCategory[] }) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const pathname = usePathname();
  const resolvedActive = activePage(pathname);

  return <header className="site-header sticky top-0 z-40 border-b border-[#dfe7f2] bg-white/92 backdrop-blur-xl">
    <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-12">
      <a href="/" className="brand-lockup" aria-label="SSPS — الصفحة الرئيسية"><span className="brand-symbol"><Printer aria-hidden="true" /></span><span><strong>SSPS</strong><small>حلول لأنظمة الحلول والطباعة</small></span></a>
      <nav className="hidden items-center gap-5 lg:flex" aria-label="التنقل الرئيسي">
        <a className={`nav-link${resolvedActive === "home" ? " nav-link--active" : ""}`} href="/" aria-current={resolvedActive === "home" ? "page" : undefined}>الرئيسية</a>
        <ProductsMenu categories={categories} active={resolvedActive === "products"} />
        {navigation.filter(item => item.key !== "home").map(item => <a key={item.key} className={`nav-link${resolvedActive === item.key ? " nav-link--active" : ""}`} href={item.href} aria-current={resolvedActive === item.key ? "page" : undefined}>{item.label}</a>)}
      </nav>
      <div className="header-actions">
        <CartLink active={pathname === "/cart" || pathname === "/checkout"} />
        <a className="header-phone" href={siteConfig.contact.phoneHref}><Phone aria-hidden="true" /><span>{siteConfig.contact.phone}</span></a>
        <Button asChild className="header-quote hidden rounded-xl bg-[#1258dc] px-4 2xl:inline-flex"><a href="/contact?type=quote">اطلب عرض السعر <ChevronLeft /></a></Button>
        <Button variant="outline" size="icon" className="rounded-xl lg:hidden" aria-label={mobileMenu ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={mobileMenu} onClick={() => setMobileMenu(current => !current)}>{mobileMenu ? <X /> : <Menu />}</Button>
      </div>
    </div>
    {mobileMenu && <nav className="mobile-nav lg:hidden" aria-label="التنقل الرئيسي للهاتف">
      <a className={resolvedActive === "home" ? "mobile-nav--active" : ""} href="/" aria-current={resolvedActive === "home" ? "page" : undefined} onClick={() => setMobileMenu(false)}>الرئيسية</a>
      <ProductsMenu categories={categories} mobile active={resolvedActive === "products"} onNavigate={() => setMobileMenu(false)} />
      {navigation.filter(item => item.key !== "home").map(item => <a key={item.key} className={resolvedActive === item.key ? "mobile-nav--active" : ""} href={item.href} aria-current={resolvedActive === item.key ? "page" : undefined} onClick={() => setMobileMenu(false)}>{item.label}</a>)}
    </nav>}
  </header>;
}
