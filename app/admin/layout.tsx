import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة التحكم | SSPS",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div dir="rtl" className="admin-root min-h-screen bg-[#f3f6fb] text-[#10213d]">{children}</div>;
}
