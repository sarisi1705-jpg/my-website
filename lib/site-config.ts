export type SiteStat = {
  value: string;
  label: string;
};

export type SiteOffer = {
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
  icon: "ink" | "maintenance" | "business";
};

export type HeroSlide = {
  image: string;
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
};

export const siteConfig = {
  contact: {
    phone: "059-000-0000",
    phoneHref: "tel:0590000000",
    whatsapp: "059-000-0000",
    whatsappHref: "https://wa.me/970590000000",
    email: "info@ssps.ps",
    address: "فلسطين — يُرجى إضافة العنوان التفصيلي",
  },

  // TODO: استبدال هذه الإحصائيات التجريبية بالأرقام الحقيقية قبل نشر الموقع.
  stats: [
    { value: "+500", label: "عميل" },
    { value: "+2000", label: "منتج" },
    { value: "+15", label: "علامة تجارية" },
    { value: "+10", label: "سنوات خبرة" },
  ] satisfies SiteStat[],

  offers: [
    {
      title: "عرض خاص على الأحبار",
      description: "خيارات اقتصادية للطباعة اليومية بجودة موثوقة.",
      buttonLabel: "تصفّح الأحبار",
      href: "/offers",
      icon: "ink",
    },
    {
      title: "صيانة الطابعات",
      description: "دعم متخصص وقطع صيانة لإبقاء أعمالك مستمرة.",
      buttonLabel: "تواصل للصيانة",
      href: "/services",
      icon: "maintenance",
    },
    {
      title: "أسعار خاصة للشركات",
      description: "حلول مناسبة للكميات واحتياجات المؤسسات.",
      buttonLabel: "اطلب عرض سعر",
      href: "/offers",
      icon: "business",
    },
  ] satisfies SiteOffer[],

  heroSlides: [
    {
      image: "/hero-banner.jpg",
      eyebrow: "حلول الطباعة المتكاملة",
      title: "تقنية تدعم يوم عملك",
      description: "طابعات ومستلزمات مختارة للمكتب والمنزل.",
      buttonLabel: "استكشف المنتجات",
      href: "/products",
    },
    {
      image: "/maintenance-banner.svg",
      eyebrow: "خدمة ودعم",
      title: "صيانة تحافظ على كفاءة طابعتك",
      description: "حلول عملية وقطع صيانة لمختلف احتياجات الطباعة.",
      buttonLabel: "اطلب خدمة صيانة",
      href: "/services",
    },
    {
      image: "/ink-offers-banner.svg",
      eyebrow: "عروض الأحبار",
      title: "ألوان أوضح بتكلفة أفضل",
      description: "تعرّف على خيارات الأحبار والتونر المتاحة.",
      buttonLabel: "شاهد عروض الأحبار",
      href: "/offers",
    },
  ] satisfies HeroSlide[],
};
