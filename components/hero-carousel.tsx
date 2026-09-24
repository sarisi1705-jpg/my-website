"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = siteConfig.heroSlides;

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setCurrent(index => (index + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const goTo = (index: number) => setCurrent((index + slides.length) % slides.length);

  return <div className="hero-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label="عروض SSPS الرئيسية">
    <div className="hero-slides" style={{ transform: `translateX(-${current * 100}%)` }}>
      {slides.map((slide, index) => <article className="hero-slide" key={slide.image} aria-hidden={current !== index}>
        <Image src={slide.image} alt="" fill sizes="(max-width: 1024px) 100vw, 48vw" priority={index === 0} />
        <div className="hero-slide-shade" />
        <div className="hero-slide-copy"><span>{slide.eyebrow}</span><h2>{slide.title}</h2><p>{slide.description}</p><a href={slide.href}>{slide.buttonLabel}<ChevronLeft /></a></div>
      </article>)}
    </div>
    <button className="carousel-arrow carousel-arrow--previous" type="button" onClick={() => goTo(current - 1)} aria-label="الشريحة السابقة"><ChevronRight /></button>
    <button className="carousel-arrow carousel-arrow--next" type="button" onClick={() => goTo(current + 1)} aria-label="الشريحة التالية"><ChevronLeft /></button>
    <div className="carousel-dots" aria-label="اختيار الشريحة">
      {slides.map((slide, index) => <button key={slide.image} type="button" aria-label={`انتقل إلى الشريحة ${index + 1}`} aria-current={current === index ? "true" : undefined} onClick={() => goTo(index)} />)}
    </div>
  </div>;
}
