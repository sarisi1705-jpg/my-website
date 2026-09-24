import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSPS | حلول لأنظمة الحلول والطباعة",
  description: "كتالوج متكامل للطابعات والأحبار وقطع الصيانة ومستلزمات الطباعة.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}<Toaster dir="rtl" position="top-center" richColors /></body></html>;
}
