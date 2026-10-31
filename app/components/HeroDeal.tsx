"use client";

import { useState } from "react";
import {
  formatPrice,
  getShortTitle,
  getSpecLine,
} from "@/lib/product-display";
import type { Product } from "@/lib/types";

export interface HeroPick {
  product: Product;
  score: number;
  reasons: string[];
  label: string;
}

interface HeroDealProps {
  picks: HeroPick[];
  categoryLabel: string;
  onOpen?: (product: Product) => void;
}

export function HeroDeal({ picks, categoryLabel, onOpen }: HeroDealProps) {
  const [current, setCurrent] = useState(0);

  if (picks.length === 0) {
    return null;
  }

  const { product, reasons } = picks[current % picks.length];
  const discountPercent = Math.round(product.savingsPercent);
  const hasDiscount = discountPercent >= 1 && product.currentPrice < product.originalPrice;
  const go = (delta: number) =>
    setCurrent((index) => (index + delta + picks.length) % picks.length);

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="Meilleures affaires"
      className="flex h-full flex-col gap-6 rounded-[22px] bg-[var(--surface)] p-6 sm:flex-row sm:items-center sm:gap-7 sm:p-7"
    >
      <div className="flex h-36 w-full shrink-0 items-center justify-center rounded-2xl bg-[var(--image-tile)] sm:w-52">
        <img src={product.imageUrl} alt="" className="h-28 max-w-[85%] object-contain mix-blend-multiply" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.6px] text-[var(--badge-top-fg)]">
            Meilleure affaire · {product.productLineLabel || categoryLabel}
          </span>
          {picks.length > 1 && (
            <div className="flex items-center gap-1 text-[var(--text-secondary)]">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Affaire précédente"
                className="rounded-full p-1.5 hover:bg-[var(--surface-secondary)] hover:text-[var(--fg)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="text-xs tabular-nums" aria-live="polite">
                {current + 1}/{picks.length}
              </span>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Affaire suivante"
                className="rounded-full p-1.5 hover:bg-[var(--surface-secondary)] hover:text-[var(--fg)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.5px]">
          {onOpen ? (
            <button type="button" onClick={() => onOpen(product)} className="text-left hover:underline" title={product.title}>
              {getShortTitle(product)}
            </button>
          ) : (
            getShortTitle(product)
          )}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">{getSpecLine(product)}</p>

        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-semibold tabular-nums">{formatPrice(product.currentPrice)}</span>
          {hasDiscount && (
            <>
              <span className="text-[15px] text-[var(--text-secondary)] line-through">
                {formatPrice(product.originalPrice)}
              </span>
              <span className="rounded-full bg-[var(--accent-blue)] px-2.5 py-0.5 text-[13px] font-semibold text-white">
                −{discountPercent} %
              </span>
            </>
          )}
        </div>

        {reasons.length > 0 && (
          <p className="text-[13px] text-[var(--text-secondary)]">{reasons.join(" · ")}</p>
        )}

        <div className="mt-2">
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-blue)] hover:underline"
          >
            Voir sur Apple
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
