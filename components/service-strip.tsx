import { Headphones, PackageCheck, ShieldCheck } from "lucide-react";

export function ServiceStrip({ id }: { id?: string }) {
  return <section id={id} className="service-strip"><div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 sm:grid-cols-3 sm:px-8 lg:px-12">
    <div><PackageCheck /><span><strong>تشكيلة متكاملة</strong><small>كل مستلزمات الطباعة في كتالوج واحد</small></span></div>
    <div><ShieldCheck /><span><strong>خيارات موثوقة</strong><small>علامات تجارية معروفة وحلول عملية</small></span></div>
    <div><Headphones /><span><strong>مساعدة متخصصة</strong><small>اختيار المنتج الأنسب لاحتياجك</small></span></div>
  </div></section>;
}
