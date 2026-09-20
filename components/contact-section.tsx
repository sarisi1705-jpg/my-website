import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

export function ContactSection({ title = "جاهزون لمساعدتك" }: { title?: string }) {
  return <section id="contact" className="contact-section">
    <div className="contact-panel mx-auto max-w-[1344px] px-5 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between">
      <div className="contact-intro"><span>تواصل مع SSPS</span><h2>{title}</h2><p>أخبرنا بما تحتاجه وسنساعدك في اختيار حل الطباعة المناسب.</p></div>
      <div className="contact-details">
        <div className="contact-buttons"><Button asChild><a href={siteConfig.contact.phoneHref}><Phone />اتصل الآن</a></Button><Button asChild variant="outline"><a href={siteConfig.contact.whatsappHref} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a></Button></div>
        <a href={`mailto:${siteConfig.contact.email}`}><Mail />{siteConfig.contact.email}</a>
        <span><MapPin />{siteConfig.contact.address}</span>
      </div>
    </div>
  </section>;
}
