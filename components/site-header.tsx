"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronLeft, Menu, Phone, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productCategories } from "@/data/product-categories";
import { siteConfig } from "@/lib/site-config";

export type SitePage = "home" | "products" | "categories" | "services" | "offers" | "about" | "contact";

const navigation: { key: SitePage; label: string; href: string }[] = [
  { key: "home", label: "الرئيسية", href: "/" },
  { key: "services", label: "خدماتنا", href: "/services" },
  { key: "offers", label: "العروض", href: "/offers" },
  { key: "about", label: "من نحن", href: "/about" },
  { key: "contact", label: "تواصل معنا", href: "/contact" },
];

function ProductsMenu({ mobile = false, active = false, onNavigate }: { mobile?: boolean; active?: boolean; onNavigate?: () => void }) {
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
      {productCategories.map(category => <a key={category.href} href={category.href} role="menuitem" onClick={onNavigate}>
        <span><strong>{category.name}</strong><small>{category.description}</small></span><ChevronLeft aria-hidden="true" />
      </a>)}
    </div>}
  </div>;
}

export function SiteHeader({ active = "home" }: { active?: SitePage }) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const pathname = usePathname();
  const resolvedActive = pathname.startsWith("/products") ? "products" : active;

  return <header className="site-header sticky top-0 z-40 border-b border-[#dfe7f2] bg-white/92 backdrop-blur-xl">
    <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-12">
      <Link href="/" className="brand-lockup" aria-label="SSPS — الصفحة الرئيسية"><span className="brand-symbol"><Printer aria-hidden="true" /></span><span><strong>SSPS</strong><small>حلول لأنظمة الحلول والطباعة</small></span></Link>
      <nav className="hidden items-center gap-5 lg:flex" aria-label="التنقل الرئيسي">
        <Link className={`nav-link${resolvedActive === "home" ? " nav-link--active" : ""}`} href="/" aria-current={resolvedActive === "home" ? "page" : undefined}>الرئيسية</Link>
        <ProductsMenu active={resolvedActive === "products"} />
        {navigation.filter(item => item.key !== "home").map(item => <a key={item.key} className={`nav-link${resolvedActive === item.key ? " nav-link--active" : ""}`} href={item.href} aria-current={resolvedActive === item.key ? "page" : undefined}>{item.label}</a>)}
      </nav>
      <div className="header-actions">
        <a className="header-phone" href={siteConfig.contact.phoneHref}><Phone aria-hidden="true" /><span>{siteConfig.contact.phone}</span></a>
        <Button asChild className="header-quote hidden rounded-xl bg-[#1258dc] px-4 2xl:inline-flex"><a href="/contact?type=quote">اطلب عرض السعر <ChevronLeft /></a></Button>
        <Button variant="outline" size="icon" className="rounded-xl lg:hidden" aria-label={mobileMenu ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={mobileMenu} onClick={() => setMobileMenu(current => !current)}>{mobileMenu ? <X /> : <Menu />}</Button>
      </div>
    </div>
    {mobileMenu && <nav className="mobile-nav lg:hidden" aria-label="التنقل الرئيسي للهاتف">
      <Link className={resolvedActive === "home" ? "mobile-nav--active" : ""} href="/" aria-current={resolvedActive === "home" ? "page" : undefined} onClick={() => setMobileMenu(false)}>الرئيسية</Link>
      <ProductsMenu mobile active={resolvedActive === "products"} onNavigate={() => setMobileMenu(false)} />
      {navigation.filter(item => item.key !== "home").map(item => <a key={item.key} className={resolvedActive === item.key ? "mobile-nav--active" : ""} href={item.href} aria-current={resolvedActive === item.key ? "page" : undefined} onClick={() => setMobileMenu(false)}>{item.label}</a>)}
    </nav>}
  </header>;
}
