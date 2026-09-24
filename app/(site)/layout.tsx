import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div dir="rtl" className="min-h-screen bg-[#f7f9fc] text-[#10213d]">
    <SiteHeader />
    <main>{children}</main>
    <SiteFooter />
  </div>;
}
