import { ChevronLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main dir="rtl" className="status-page">
    <SearchX aria-hidden="true" />
    <h1>الصفحة غير موجودة</h1>
    <p>ربما تم نقل هذه الصفحة أو أن الرابط غير صحيح.</p>
    <div className="status-page-actions">
      <Button asChild><a href="/products">تصفّح المنتجات <ChevronLeft /></a></Button>
      <Button asChild variant="outline"><a href="/">العودة إلى الرئيسية</a></Button>
    </div>
  </main>;
}
