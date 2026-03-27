"use client";

import { useState, useCallback } from "react";
import type { Product } from "@/lib/types";
import { Badge } from "./Badge";

interface HeroDealProps {
  bestDeal: Product;
  topDiscount: Product;
}

const SCREEN_LABELS: Record<string, string> = {
  "14": '14"',
  "16": '16"',
};

interface SlideConfig {
  product: Product;
  label: string;
  color: string;
  icon: React.ReactNode;
}

function HeroSlide({ product }: { product: Product }) {
  const discountPercent = Math.round(product.savingsPercent);
  const savingsAmount = product.originalPrice - product.currentPrice;
  const rawScreen = product.screenSize?.replace(/[^0-9]/g, "") ?? "";
  const screenLabel = rawScreen
    ? (SCREEN_LABELS[rawScreen] ?? `${rawScreen}"`)
    : null;

  return (
    <div className="flex flex-col sm:flex-row gap-6 p-5">
      <div className="flex items-center justify-center sm:w-48 shrink-0">
        <img
          src={product.imageUrl}
          alt={product.title}
          width={180}
          height={180}
          className="h-36 sm:h-44 object-contain"
        />
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="chip">{product.chip}</Badge>
          {screenLabel && (
            <span className="text-xs text-[var(--text-secondary)]">{screenLabel}</span>
          )}
          {product.isNew && <Badge variant="new">Nouveau</Badge>}
        </div>

        <h2 className="text-lg font-semibold leading-snug line-clamp-2">
          {product.title}
        </h2>

        <div className="flex items-center gap-3 flex-wrap">
          {product.memory && (
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {product.memory.toUpperCase()}
            </span>
          )}
          {product.storage && (
            <>
              <span className="text-[var(--border)]" aria-hidden>·</span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {product.storage.toUpperCase()}
              </span>
            </>
          )}
          {product.releaseYear && (
            <>
              <span className="text-[var(--border)]" aria-hidden>·</span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {product.releaseYear}
              </span>
            </>
          )}
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-[var(--fg)]">
            {product.currentPrice.toLocaleString("fr-FR")} €
          </span>
          {discountPercent > 0 && savingsAmount > 0 && (
            <>
              <span className="text-sm text-[var(--text-secondary)] line-through">
                {product.originalPrice.toLocaleString("fr-FR")} €
              </span>
              <Badge variant="discount">-{discountPercent}%</Badge>
            </>
          )}
        </div>

        {discountPercent > 0 && savingsAmount > 0 && (
          <p className="text-sm font-medium text-emerald-500 dark:text-emerald-400">
            Économisez {savingsAmount.toLocaleString("fr-FR")} €
          </p>
        )}

        <div className="pt-1">
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0077ed] dark:bg-[#2997ff] dark:hover:bg-[#40a9ff]"
          >
            Voir sur Apple
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

export function HeroDeal({ bestDeal, topDiscount }: HeroDealProps) {
  const slides: SlideConfig[] = [
    {
      product: bestDeal,
      label: "Meilleur deal",
      color: "bg-amber-500",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="M22 4L12 14.01l-3-3" />
        </svg>
      ),
    },
    {
      product: topDiscount,
      label: "Top remise",
      color: "bg-emerald-500 dark:bg-emerald-400",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white">
          <path d="M12 2l2.62 5.3 5.86.85-4.24 4.13 1 5.84L12 15.7l-5.24 2.42 1-5.84L3.52 8.15l5.86-.85L12 2z" />
        </svg>
      ),
    },
  ];

  const [current, setCurrent] = useState(0);
  const slide = slides[current];

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, []);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length);
  }, []);

  const borderColor = current === 0 ? "border-amber-500/30" : "border-emerald-500/30 dark:border-emerald-400/30";

  return (
    <div className={`rounded-2xl border ${borderColor} bg-[var(--surface)] shadow-[var(--shadow-sm)] overflow-hidden`}>
      {/* Header */}
      <div className={`${slide.color} px-4 py-2 flex items-center justify-between transition-colors`}>
        <div className="flex items-center gap-2">
          {slide.icon}
          <span className="text-[11px] font-semibold text-white uppercase tracking-wider">
            {slide.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="p-1 rounded-full hover:bg-white/20 transition-colors text-white"
            aria-label="Precedent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-[11px] font-medium text-white/80">
            {current + 1}/{slides.length}
          </span>
          <button
            onClick={next}
            className="p-1 rounded-full hover:bg-white/20 transition-colors text-white"
            aria-label="Suivant"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Slide */}
      <HeroSlide product={slide.product} />

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 pb-4">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all ${
              i === current
                ? `w-6 h-2 ${i === 0 ? "bg-amber-500" : "bg-emerald-500 dark:bg-emerald-400"}`
                : "w-2 h-2 bg-[var(--border)] hover:bg-[var(--border-hover)]"
            }`}
            aria-label={`Voir ${s.label}`}
          />
        ))}
      </div>
    </div>
  );
}
