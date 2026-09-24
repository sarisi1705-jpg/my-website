import { Box, ChevronLeft, CircleGauge, Droplets, Grid2X2, PackageCheck, Printer, Wrench } from "lucide-react";
import { ContactSection } from "@/components/contact-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { productCategories } from "@/data/product-categories";

const categoryIcons: Record<string, typeof Printer> = {
  printers: Printer,
  toners: Droplets,
  parts: CircleGauge,
  paper: Box,
  solutions: Wrench,
};

export default function CategoriesPage() {
  return <main dir="rtl" className="min-h-screen bg-[#f7f9fc] text-[#10213d]">
    <SiteHeader active="categories" />
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-16 text-center sm:px-8"><span><Grid2X2 /> تصفّح حسب القسم</span><h1>التصنيفات</h1><p>مساحة مخصصة لتنظيم الطابعات والأحبار وقطع الصيانة ومستلزمات الطباعة والحلول المتكاملة، بحسب احتياجك.</p></div></section>

    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8 lg:px-12"><div className="section-heading"><div><span>كل الأقسام</span><h2>اختر القسم المناسب لك</h2></div><a target="_top" href="/products">عرض كل المنتجات <ChevronLeft /></a></div>
      <div className="category-grid">{productCategories.map(category => {
        const Icon = categoryIcons[category.slug] ?? Printer;
        return <a target="_top" key={category.slug} href={category.href} className="category-card"><span><Icon /></span><div><strong>{category.name}</strong><small>{category.description}</small></div><ChevronLeft /></a>;
      })}</div>
    </section>

    <section className="service-strip"><div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 sm:grid-cols-3 sm:px-8 lg:px-12"><div><PackageCheck /><span><strong>تنظيم واضح</strong><small>كل قسم يجمع المنتجات المرتبطة به في مكان واحد</small></span></div><div><Grid2X2 /><span><strong>وصول سريع</strong><small>انتقل مباشرة إلى القسم الذي يهمك</small></span></div><div><Wrench /><span><strong>حلول متكاملة</strong><small>من الأجهزة إلى المستلزمات وقطع الصيانة</small></span></div></div></section>
    <ContactSection title="لم تجد القسم المناسب؟" />
    <SiteFooter />
  </main>;
}
