"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <main dir="rtl" className="status-page">
    <TriangleAlert aria-hidden="true" />
    <h1>حدث خطأ غير متوقع</h1>
    <p>نعتذر عن ذلك. حاول مرة أخرى، أو تواصل معنا مباشرة على <a href={siteConfig.contact.phoneHref} dir="ltr">{siteConfig.contact.phone}</a>.</p>
    <div className="status-page-actions">
      <Button onClick={reset}><RotateCcw />إعادة المحاولة</Button>
      <Button asChild variant="outline"><a href="/">العودة إلى الرئيسية</a></Button>
    </div>
  </main>;
}
