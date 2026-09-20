import { Mail, MapPin, Phone, Printer } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return <footer><div className="footer-inner mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[1.2fr_1fr_1fr] lg:px-12">
    <div><div className="brand-lockup brand-lockup--footer"><span className="brand-symbol"><Printer aria-hidden="true" /></span><span><strong>SSPS</strong><small>حلول لأنظمة الحلول والطباعة</small></span></div><p>حلول متكاملة للطابعات والأحبار والصيانة ومستلزمات الطباعة.</p></div>
    <div className="footer-links"><strong>روابط سريعة</strong><Link href="/about">من نحن</Link><Link href="/products">المنتجات</Link><Link href="/offers">العروض</Link><Link href="/contact">تواصل معنا</Link></div>
    <div className="footer-contact"><strong>معلومات التواصل</strong><a href={siteConfig.contact.phoneHref}><Phone />{siteConfig.contact.phone}</a><a href={`mailto:${siteConfig.contact.email}`}><Mail />{siteConfig.contact.email}</a><span><MapPin />{siteConfig.contact.address}</span></div>
    <div className="footer-bottom"><span>SSPS © 2026</span><span>بيانات التواصل الحالية قابلة للتحديث من ملف الإعدادات.</span></div>
  </div></footer>;
}
