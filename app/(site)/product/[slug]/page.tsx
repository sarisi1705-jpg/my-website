import type { Metadata } from "next";
import { env } from "cloudflare:workers";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageCircle, PackageCheck, Send } from "lucide-react";
import { AddToCart } from "@/components/add-to-cart";
import { Button } from "@/components/ui/button";
import { InquiryForm } from "@/components/inquiry-form";
import { PriceTag } from "@/components/price-tag";
import { ProductCard } from "@/components/product-card";
import { ProductMark } from "@/components/product-mark";
import { getDb } from "@/db";
import { productImageUrl } from "@/lib/images";
import { isPurchasable } from "@/lib/catalog-constants";
import { getProductBySlug, getRelatedProducts } from "@/lib/server/catalog";
import { siteConfig } from "@/lib/site-config";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(getDb(), (await params).slug);
  if (!product) return { title: "المنتج غير موجود | SSPS" };
  const image = productImageUrl(product.imageKey);
  return {
    title: `${product.name} ${product.brand.name} ${product.model} | SSPS`,
    description: product.description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { title: product.name, description: product.description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function ProductPage({ params }: Props) {
  const db = getDb();
  const product = await getProductBySlug(db, (await params).slug);
  if (!product) notFound();
  const related = await getRelatedProducts(db, product);
  const imageUrl = productImageUrl(product.imageKey);
  const purchasable = isPurchasable(product);
  const whatsappText =`مرحباً، أرغب بالاستفسار عن ${product.name} (${product.brand.name} ${product.model})`;

  // Structured data so search engines can show the product properly.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    model: product.model,
    description: product.description,
    brand: { "@type": "Brand", name: product.brand.name },
    category: product.category.name,
    ...(imageUrl ? { image: `${env.PUBLIC_SITE_URL}${imageUrl}` } : {}),
    ...(product.priceMinor !== null
      ? { offers: { "@type": "Offer", price: (product.priceMinor / 100).toFixed(2), priceCurrency: product.currency, availability: "https://schema.org/InStock" } }
      : {}),
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <section className="product-detail mx-auto max-w-[1300px] px-4 py-10 sm:px-8 lg:px-12">
      <nav className="breadcrumb" aria-label="مسار التنقل">
        <ol>
          <li><a href="/">الرئيسية</a></li>
          <li><a href="/products">المنتجات</a></li>
          <li><a href={`/products/${product.category.slug}`}>{product.category.name}</a></li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className="product-detail-grid">
        <div className="product-detail-media">
          {product.featured && <span className="featured-chip">مختار</span>}
          <ProductMark iconKey={product.category.iconKey} color={product.color} brandName={product.brand.name} imageUrl={imageUrl} alt={product.name} large />
        </div>
        <div className="product-detail-info">
          <span className="product-detail-meta"><a href={`/products/${product.category.slug}`}>{product.category.name}</a> · {product.brand.name}</span>
          <h1>{product.name}</h1>
          <p className="detail-model" dir="ltr">{product.model}</p>
          <PriceTag priceMinor={product.priceMinor} currency={product.currency} large />
          <p className="detail-copy">{product.description}</p>
          {product.specs.length > 0 && <>
            <h2 className="detail-title">المواصفات الأساسية</h2>
            <ul className="spec-list">{product.specs.map(spec => <li key={spec}><PackageCheck />{spec}</li>)}</ul>
          </>}
          {purchasable && <AddToCart productId={product.id} name={product.name} />}
          <div className="product-detail-actions">
            <Button asChild size="lg" variant={purchasable ? "outline" : "default"} className={`rounded-xl${purchasable ? "" : " bg-[#1258dc]"}`}><a href="#quote"><Send />{purchasable ? "سعر خاص للكميات" : "اطلب عرض سعر"}</a></Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl"><a href={`${siteConfig.contact.whatsappHref}?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer"><MessageCircle />استفسر عبر WhatsApp</a></Button>
          </div>
        </div>
      </div>
    </section>

    <section id="quote" className="product-quote mx-auto max-w-[900px] px-4 pb-16 sm:px-8">
      <div className="inquiry-card">
        <h2>اطلب عرض سعر لهذا المنتج</h2>
        <p>أرسل الكمية المطلوبة وأي تفاصيل إضافية، وسيتواصل معك فريق SSPS بعرض سعر مناسب.</p>
        <InquiryForm siteKey={env.TURNSTILE_SITE_KEY} whatsappHref={siteConfig.contact.whatsappHref} defaultType="quote"
          product={{ id: product.id, name: product.name, brand: product.brand.name, model: product.model }} />
      </div>
    </section>

    {related.length > 0 && <section className="catalog-section"><div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 lg:px-12">
      <div className="section-heading catalog-heading"><div><span>من نفس القسم</span><h2>منتجات ذات صلة</h2></div><a href={`/products/${product.category.slug}`}>عرض القسم <ChevronLeft /></a></div>
      <div className="products-grid">{related.map(item => <ProductCard key={item.id} product={item} />)}</div>
    </div></section>}
  </>;
}
