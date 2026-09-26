import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = {
  title: "سلة المشتريات | SSPS",
  robots: { index: false },
};

export default function CartPage() {
  return <section className="store-page mx-auto max-w-[1200px] px-4 py-10 sm:px-8 lg:px-12">
    <nav className="breadcrumb" aria-label="مسار التنقل">
      <ol><li><a href="/">الرئيسية</a></li><li><a href="/products">المنتجات</a></li><li aria-current="page">السلة</li></ol>
    </nav>
    <h1 className="store-title">سلة المشتريات</h1>
    <CartView />
  </section>;
}
