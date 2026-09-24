import { inquiryStatusLabels } from "@/lib/inquiry-constants";

const productStatusLabels: Record<string, string> = { draft: "مسودة", published: "منشور", archived: "مؤرشف" };

export function InquiryStatusBadge({ status }: { status: keyof typeof inquiryStatusLabels }) {
  return <span className={`status-badge status-badge--${status}`}>{inquiryStatusLabels[status]}</span>;
}

export function ProductStatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-badge--${status}`}>{productStatusLabels[status] ?? status}</span>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <span className="status-badge status-badge--published">فعّال</span> : <span className="status-badge status-badge--inactive">معطّل</span>;
}
