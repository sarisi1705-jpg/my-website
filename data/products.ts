import { Box, CircleGauge, Droplets, Printer } from "lucide-react";

export type Category = "طابعات" | "أحبار وتونر" | "قطع وصيانة" | "ورق وطباعة";
export type Product = { id: number; name: string; model: string; brand: string; category: Category; description: string; color: string; specs: string[]; featured?: boolean };

export const products: Product[] = [
  { id: 1, name: "طابعة ليزر مكتبية", model: "VersaLink B415", brand: "Xerox", category: "طابعات", description: "طابعة أحادية اللون سريعة ومناسبة لمجموعات العمل.", color: "#2563eb", specs: ["طباعة ليزر", "اتصال شبكي", "طباعة على الوجهين"], featured: true },
  { id: 2, name: "طابعة EcoTank ملونة", model: "L6290", brand: "Epson", category: "طابعات", description: "حل اقتصادي للطباعة اليومية بخزانات حبر قابلة لإعادة التعبئة.", color: "#0891b2", specs: ["ألوان", "Wi‑Fi", "ماسح ضوئي"], featured: true },
  { id: 3, name: "طابعة ليزر متعددة الوظائف", model: "LaserJet Pro 4103fdw", brand: "HP", category: "طابعات", description: "طباعة ومسح ونسخ للمكاتب ذات ضغط العمل المتوسط.", color: "#4f46e5", specs: ["متعددة الوظائف", "Wi‑Fi", "تغذية تلقائية"] },
  { id: 4, name: "طابعة صور احترافية", model: "imagePROGRAF PRO-300", brand: "Canon", category: "طابعات", description: "دقة ألوان عالية للمصورين والاستوديوهات.", color: "#7c3aed", specs: ["طباعة صور", "A3+", "اتصال لاسلكي"] },
  { id: 5, name: "تونر أسود عالي السعة", model: "006R04731", brand: "Xerox", category: "أحبار وتونر", description: "خرطوشة تونر للاستخدام المكتبي المكثف.", color: "#1e3a8a", specs: ["أسود", "سعة عالية", "عبوة واحدة"], featured: true },
  { id: 6, name: "عبوة حبر أسود", model: "T7741", brand: "Epson", category: "أحبار وتونر", description: "عبوة حبر أصلية لأنظمة EcoTank المتوافقة.", color: "#0f766e", specs: ["أسود", "70 مل", "EcoTank"] },
  { id: 7, name: "تونر LaserJet سماوي", model: "W2031A", brand: "HP", category: "أحبار وتونر", description: "لون ثابت ونتائج واضحة للمستندات والعروض.", color: "#0284c7", specs: ["سماوي", "ليزر", "خرطوشة أصلية"] },
  { id: 8, name: "حبر PIXMA متعدد الألوان", model: "GI-490 C/M/Y", brand: "Canon", category: "أحبار وتونر", description: "طقم عبوات ملونة للطباعة المنزلية والمكتبية.", color: "#db2777", specs: ["3 ألوان", "Inkjet", "طقم اقتصادي"] },
  { id: 9, name: "وحدة تصوير", model: "013R00691", brand: "Xerox", category: "قطع وصيانة", description: "وحدة تصوير بديلة للحفاظ على جودة الطباعة.", color: "#475569", specs: ["قطعة صيانة", "عمر طويل", "تركيب سهل"] },
  { id: 10, name: "رول تغذية ورق", model: "RM2-5392", brand: "HP", category: "قطع وصيانة", description: "قطعة تغذية بديلة لمجموعة من طابعات LaserJet.", color: "#64748b", specs: ["قطعة بديلة", "مطاط مقوّى", "لدرج الورق"] },
  { id: 11, name: "صندوق صيانة", model: "T04D1", brand: "Epson", category: "قطع وصيانة", description: "وحدة تجميع حبر فائض سهلة الاستبدال.", color: "#334155", specs: ["صندوق صيانة", "تركيب مباشر", "Inkjet"] },
  { id: 12, name: "رأس طباعة", model: "PF-06", brand: "Canon", category: "قطع وصيانة", description: "رأس طباعة دقيق لطابعات التنسيق الكبير.", color: "#374151", specs: ["دقة عالية", "Large format", "قطعة أصلية"] },
  { id: 13, name: "ورق تصوير يومي", model: "A4 — 80 gsm", brand: "Navigator", category: "ورق وطباعة", description: "ورق أبيض ناعم للطباعة والنسخ اليومي.", color: "#f59e0b", specs: ["A4", "80 gsm", "500 ورقة"] },
  { id: 14, name: "ورق صور لامع", model: "A4 — 200 gsm", brand: "Epson", category: "ورق وطباعة", description: "سطح لامع للصور والعروض عالية الجودة.", color: "#ea580c", specs: ["لامع", "A4", "20 ورقة"] },
  { id: 15, name: "ملصقات ذاتية اللصق", model: "A4 Labels", brand: "Avery", category: "ورق وطباعة", description: "صفائح ملصقات متعددة الاستخدامات للطابعات المكتبية.", color: "#d97706", specs: ["ذاتي اللصق", "A4", "قص مسبق"] },
  { id: 16, name: "ورق رول للبلوتر", model: "A0 — 90 gsm", brand: "Canon", category: "ورق وطباعة", description: "رول ورق للمخططات والرسومات الهندسية.", color: "#ca8a04", specs: ["A0", "90 gsm", "طول 50 متر"] },
];

export const categories: { name: Category; icon: typeof Printer; note: string }[] = [
  { name: "طابعات", icon: Printer, note: "4 منتجات" }, { name: "أحبار وتونر", icon: Droplets, note: "4 منتجات" }, { name: "قطع وصيانة", icon: CircleGauge, note: "4 منتجات" }, { name: "ورق وطباعة", icon: Box, note: "4 منتجات" },
];

export const brands = ["الكل", "Xerox", "Epson", "HP", "Canon", "Navigator", "Avery"];

export const categoryIcon: Record<Category, typeof Printer> = {
  "طابعات": Printer,
  "أحبار وتونر": Droplets,
  "قطع وصيانة": CircleGauge,
  "ورق وطباعة": Box,
};

// Maps the /products/[slug] category pages to the product Category values above.
// "solutions" (الأجهزة والحلول) has no matching products in the demo catalog yet.
export const slugToCategory: Partial<Record<string, Category>> = {
  printers: "طابعات",
  toners: "أحبار وتونر",
  parts: "قطع وصيانة",
  paper: "ورق وطباعة",
};
