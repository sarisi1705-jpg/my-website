import { Building2, ChevronLeft, Droplets, Wrench } from "lucide-react";
import Link from "next/link";
import { siteConfig, type SiteOffer } from "@/lib/site-config";

const offerIcons: Record<SiteOffer["icon"], typeof Droplets> = {
  ink: Droplets,
  maintenance: Wrench,
  business: Building2,
};

export function OffersPanel() {
  return <aside className="offers-panel" aria-labelledby="offers-title">
    <div className="offers-heading"><span>فرص مختارة</span><h2 id="offers-title">عروض وخدمات</h2></div>
    <div className="offers-list">
      {siteConfig.offers.map(offer => {
        const Icon = offerIcons[offer.icon];
        return <article className={`offer-card offer-card--${offer.icon}`} key={offer.title}>
          <Icon aria-hidden="true" /><div><h3>{offer.title}</h3><p>{offer.description}</p><Link href={offer.href}>{offer.buttonLabel}<ChevronLeft /></Link></div>
        </article>;
      })}
    </div>
  </aside>;
}
