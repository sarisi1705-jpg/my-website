export type ProductCategory = {
  slug: string;
  name: string;
  href: string;
  description: string;
};

export const productCategories: ProductCategory[] = [
  {
    slug: "printers",
    name: "الطابعات",
    href: "/products/printers",
    description: "مساحة مخصصة لعرض الطابعات المكتبية والمنزلية وحلول الطباعة المتنوعة.",
  },
  {
    slug: "toners",
    name: "الأحبار والتونر",
    href: "/products/toners",
    description: "مساحة مخصصة لعرض الأحبار وعبوات التونر المتوافقة مع احتياجات الطباعة.",
  },
  {
    slug: "parts",
    name: "قطع الصيانة",
    href: "/products/parts",
    description: "مساحة مخصصة لقطع الغيار والصيانة اللازمة للحفاظ على كفاءة الأجهزة.",
  },
  {
    slug: "paper",
    name: "الورق ومستلزمات الطباعة",
    href: "/products/paper",
    description: "مساحة مخصصة للورق والملصقات ومختلف مستلزمات الطباعة اليومية.",
  },
  {
    slug: "solutions",
    name: "الأجهزة والحلول",
    href: "/products/solutions",
    description: "مساحة مخصصة للأجهزة والحلول المتكاملة للمكاتب والشركات.",
  },
];

export function getProductCategory(slug: string) {
  return productCategories.find(category => category.slug === slug);
}
