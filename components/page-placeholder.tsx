import { Layers3 } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader, type SitePage } from "@/components/site-header";

export function PagePlaceholder({ active, title, description }: { active: SitePage; title: string; description: string }) {
  return <main dir="rtl" className="min-h-screen bg-[#f7f9fc] text-[#10213d]">
    <SiteHeader active={active} />
    <section className="inner-hero"><div className="mx-auto max-w-[1100px] px-4 py-16 text-center sm:px-8"><span><Layers3 /> صفحة SSPS</span><h1>{title}</h1><p>{description}</p></div></section>
    <section className="placeholder-space mx-auto max-w-[1200px] px-4 py-14 sm:px-8 lg:px-12" aria-label={`مساحة محتوى صفحة ${title}`}><div aria-hidden="true" /></section>
    <SiteFooter />
  </main>;
}
