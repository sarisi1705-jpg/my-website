import { inquiryStatusLabels } from "@/lib/inquiry-constants";
import { orderStatusLabels, paymentStatusLabels, type OrderStatus, type PaymentStatus } from "@/lib/order-constants";

const productStatusLabels: Record<string, string> = { draft: "مسودة", published: "منشور", archived: "مؤرشف" };

export function InquiryStatusBadge({ status }: { status: keyof typeof inquiryStatusLabels }) {
  return <span className={`status-badge status-badge--${status}`}>{inquiryStatusLabels[status]}</span>;
}

// Order classes are prefixed: "new" and inquiry statuses would otherwise share colours by accident.
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status-badge status-badge--order-${status}`}>{orderStatusLabels[status]}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <span className={`status-badge status-badge--pay-${status}`}>{paymentStatusLabels[status]}</span>;
}

export function ProductStatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-badge--${status}`}>{productStatusLabels[status] ?? status}</span>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <span className="status-badge status-badge--published">فعّال</span> : <span className="status-badge status-badge--inactive">معطّل</span>;
}
