"use client";

import { useState, useCallback } from "react";
import {
  formatScreenSize,
  getProductLineLabel,
} from "@/lib/product-catalog";
import type { Product } from "@/lib/types";
import { Badge } from "./Badge";

export interface HeroPick {
  product: Product;
  score: number;
  reasons: string[];
  label: string;
}

interface SlideConfig {
  pick: HeroPick;
  label: string;
  color: string;
}

interface HeroDealProps {
  picks: HeroPick[];
}

function HeroSlide({ pick }: { pick: HeroPick }) {
  const { product, score, reasons } = pick;
  const discountPercent = Math.round(product.savingsPercent);
  const savingsAmount = product.originalPrice - product.currentPrice;
  const screenLabel = formatScreenSize(product.screenSize);

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
          <Badge variant="line">{getProductLineLabel(product.productLine)}</Badge>
          {screenLabel && (
            <span className="text-xs text-[var(--text-secondary)]">{screenLabel}</span>
          )}
          {product.isNew && <Badge variant="new">Nouveau</Badge>}
        </div>

        <h2 className="text-lg font-semibold leading-snug line-clamp-2">
          {product.title}
        </h2>

        {reasons.length > 0 && (
          <p className="text-sm text-[var(--text-secondary)]">
            {reasons.join(" · ")}
          </p>
        )}

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
          <>
            <span className="text-[var(--border)]" aria-hidden>·</span>
            <span
              className="text-xs font-medium text-[var(--text-secondary)]"
              title="Score développeur : adéquation dev plus opportunité de prix"
            >
              Score {score.toFixed(0)}
            </span>
          </>
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

export function HeroDeal({ picks }: HeroDealProps) {
  const slides: SlideConfig[] = picks.map((pick) => ({
    pick,
    label: pick.label,
    color:
      pick.product.productLine === "air"
        ? "bg-sky-500"
        : "bg-amber-500",
  }));

  if (slides.length === 0) {
    return null;
  }

  const [current, setCurrent] = useState(0);
  const slide = slides[current];

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, []);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length);
  }, []);

  const borderColor =
    slide.pick.product.productLine === "air"
      ? "border-sky-500/30"
      : "border-amber-500/30";

  return (
    <div className={`rounded-2xl border ${borderColor} bg-[var(--surface)] shadow-[var(--shadow-sm)] overflow-hidden`}>
      {/* Header */}
      <div className={`${slide.color} px-4 py-2 flex items-center justify-between transition-colors`}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white uppercase tracking-wider">
            {slide.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="p-1 rounded-full hover:bg-white/20 transition-colors text-white"
            aria-label="Précédent"
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
      <HeroSlide pick={slide.pick} />

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 pb-4">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all ${
              i === current
                ? `w-6 h-2 ${
                    s.pick.product.productLine === "air"
                      ? "bg-sky-500"
                      : "bg-amber-500"
                  }`
                : "w-2 h-2 bg-[var(--border)] hover:bg-[var(--border-hover)]"
            }`}
            aria-label={`Voir ${s.label}`}
          />
        ))}
      </div>
    </div>
  );
}
