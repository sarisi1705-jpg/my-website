import type { Metadata } from "next";
import { env } from "cloudflare:workers";
import { CheckoutForm } from "@/components/checkout-form";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "إتمام الطلب | SSPS",
  robots: { index: false },
};

export default function CheckoutPage() {
  return <section className="store-page mx-auto max-w-[1200px] px-4 py-10 sm:px-8 lg:px-12">
    <nav className="breadcrumb" aria-label="مسار التنقل">
      <ol><li><a href="/">الرئيسية</a></li><li><a href="/cart">السلة</a></li><li aria-current="page">إتمام الطلب</li></ol>
    </nav>
    <h1 className="store-title">إتمام الطلب</h1>
    <CheckoutForm siteKey={env.TURNSTILE_SITE_KEY} whatsappHref={siteConfig.contact.whatsappHref} />
  </section>;
}
