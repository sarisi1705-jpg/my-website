import type { Metadata } from "next";
import { ChevronLeft, Grid2X2, PackageCheck, Wrench } from "lucide-react";
import { ContactSection } from "@/components/contact-section";
import { getDb } from "@/db";
import { CategoryIcon } from "@/lib/icons";
import { listCategoriesWithCounts } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "التصنيفات | SSPS", description: "تصفّح أقسام منتجات SSPS: الطابعات والأحبار وقطع الصيانة والورق والحلول المتكاملة." };

export default async function CategoriesPage() {
  const categories = await listCategoriesWithCounts(getDb());
  return <>
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-16 text-center sm:px-8"><span><Grid2X2 /> تصفّح حسب القسم</span><h1>التصنيفات</h1><p>مساحة مخصصة لتنظيم الطابعات والأحبار وقطع الصيانة ومستلزمات الطباعة والحلول المتكاملة، بحسب احتياجك.</p></div></section>

    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8 lg:px-12"><div className="section-heading"><div><span>كل الأقسام</span><h2>اختر القسم المناسب لك</h2></div><a href="/products">عرض كل المنتجات <ChevronLeft /></a></div>
      <div className="category-grid">{categories.map(category =>
        <a key={category.slug} href={`/products/${category.slug}`} className="category-card"><span><CategoryIcon iconKey={category.iconKey} /></span><div><strong>{category.name}</strong><small>{category.description}</small></div><ChevronLeft /></a>)}</div>
    </section>

    <section className="service-strip"><div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 sm:grid-cols-3 sm:px-8 lg:px-12"><div><PackageCheck /><span><strong>تنظيم واضح</strong><small>كل قسم يجمع المنتجات المرتبطة به في مكان واحد</small></span></div><div><Grid2X2 /><span><strong>وصول سريع</strong><small>انتقل مباشرة إلى القسم الذي يهمك</small></span></div><div><Wrench /><span><strong>حلول متكاملة</strong><small>من الأجهزة إلى المستلزمات وقطع الصيانة</small></span></div></div></section>
    <ContactSection title="لم تجد القسم المناسب؟" />
  </>;
}
