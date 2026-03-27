"use client";

import type { Product } from "@/lib/types";
import { Badge } from "./Badge";
import { computeDealScore } from "@/lib/deal-score";

interface ProductCardProps {
  product: Product;
  isBestDeal?: boolean;
  isTopDiscount?: boolean;
  isExpired?: boolean;
  onShowHistory?: (product: Product) => void;
}

const SCREEN_LABELS: Record<string, string> = {
  "14": '14"',
  "16": '16"',
};

const COLOR_MAP: Record<string, { hex: string; label: string; textDark?: boolean }> = {
  spacegray: { hex: "#7d7e80", label: "Gris sideral", textDark: false },
  spaceblack: { hex: "#393b3d", label: "Noir sideral", textDark: false },
  silver: { hex: "#c0c1c4", label: "Argent", textDark: true },
  midnightblue: { hex: "#1f2937", label: "Minuit", textDark: false },
};

export function ProductCard({
  product,
  isBestDeal = false,
  isTopDiscount = false,
  isExpired = false,
  onShowHistory,
}: ProductCardProps) {
  const discountPercent = Math.round(product.savingsPercent);
  const hasDiscount =
    discountPercent >= 1 && product.currentPrice < product.originalPrice;
  const rawScreen = product.screenSize?.replace(/[^0-9]/g, "") ?? "";
  const screenLabel = rawScreen
    ? (SCREEN_LABELS[rawScreen] ?? `${rawScreen}"`)
    : null;
  const savingsAmount = product.originalPrice - product.currentPrice;
  const colorInfo = product.color ? COLOR_MAP[product.color] : null;
  const dealScore = computeDealScore(product);

  return (
    <div
      className={`group flex flex-row sm:flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-all duration-200 ease-out ${
        isExpired
          ? "border-[var(--border)] opacity-70"
          : `hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${
              isBestDeal
                ? "ring-2 ring-amber-500 border-amber-500/30"
                : isTopDiscount
                  ? "ring-2 ring-[var(--accent-green)] border-[var(--accent-green)]/30"
                  : "border-[var(--border)] hover:border-[var(--border-hover)]"
            }`
      }`}
    >
      {/* Image */}
      <div className="relative flex items-center justify-center bg-[var(--image-bg)] p-3 sm:p-4 w-24 sm:w-full shrink-0">
        <img
          src={product.imageUrl}
          alt={product.title}
          width={200}
          height={200}
          className={`h-20 sm:h-40 object-contain ${isExpired ? "grayscale opacity-60" : ""}`}
        />
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-row flex-wrap gap-1.5">
          {isExpired ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-500 px-2.5 py-[5px] text-[11px] leading-none font-semibold text-white">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
              Indisponible
            </div>
          ) : (
            <>
              {product.isNew && (
                <Badge variant="new">Nouveau</Badge>
              )}
              {isBestDeal && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-[5px] text-[11px] leading-none font-semibold text-white shadow-sm shadow-amber-500/30">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="M22 4L12 14.01l-3-3" />
                  </svg>
                  Meilleur deal
                </div>
              )}
              {isTopDiscount && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-[5px] text-[11px] leading-none font-semibold text-white dark:bg-emerald-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.62 5.3 5.86.85-4.24 4.13 1 5.84L12 15.7l-5.24 2.42 1-5.84L3.52 8.15l5.86-.85L12 2z" />
                  </svg>
                  Top remise
                </div>
              )}
            </>
          )}
        </div>
        {!isExpired && hasDiscount && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
            <Badge variant="discount">-{discountPercent}%</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 sm:p-5 space-y-2.5 sm:space-y-3 min-w-0">
        {/* Chip badge + color tag */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="chip">{product.chip || "—"}</Badge>
          {colorInfo && (
            <span
              className={`inline-flex items-center px-2.5 py-[5px] rounded-full text-[11px] leading-none font-semibold border border-transparent ${
                colorInfo.textDark ? "text-[#1d1d1f]" : "text-white"
              }`}
              style={{ backgroundColor: colorInfo.hex }}
            >
              {colorInfo.label}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xl font-bold text-[var(--fg)]">
            {product.currentPrice.toLocaleString("fr-FR")} €
          </span>
          {hasDiscount && (
            <span className="text-sm text-[var(--text-secondary)] line-through">
              {product.originalPrice.toLocaleString("fr-FR")} €
            </span>
          )}
        </div>

        {/* Savings + Deal score */}
        <div className="flex items-center justify-between">
          <p className={`text-xs font-medium ${hasDiscount ? "text-emerald-500 dark:text-emerald-400" : "invisible"}`}>
            Économisez {savingsAmount.toLocaleString("fr-FR")} €
          </p>
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)]" title="Deal score : rapport qualite/prix">
            Score {dealScore.toFixed(1)}
          </span>
        </div>

        {/* Date d'apparition du deal */}
        <p className="text-[11px] text-[var(--text-tertiary)]">
          Apparu le{" "}
          {new Date(product.firstSeen).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "Europe/Paris",
          })}
          {" "}
          {new Date(product.firstSeen).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Paris",
          })}
        </p>

        {/* Specs grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {product.memory && (
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)] shrink-0">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M6 6V4M10 6V4M14 6V4M18 6V4" />
              </svg>
              <span className="text-xs font-semibold">{product.memory.toUpperCase()}</span>
            </div>
          )}
          {product.storage && (
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)] shrink-0">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 3v18" />
              </svg>
              <span className="text-xs font-semibold">{product.storage.toUpperCase()}</span>
            </div>
          )}
          {screenLabel && (
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)] shrink-0">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              <span className="text-xs font-semibold">{screenLabel}</span>
            </div>
          )}
          {product.releaseYear && (
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)] shrink-0">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span className="text-xs font-semibold">{product.releaseYear}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          {isExpired ? (
            <div className="block w-full rounded-full bg-neutral-400 dark:bg-neutral-600 px-4 py-2.5 text-center text-sm font-medium text-white cursor-default">
              Plus disponible
            </div>
          ) : (
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-full bg-[#0071e3] px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[#0077ed] dark:bg-[#2997ff] dark:hover:bg-[#40a9ff]"
            >
              Voir sur Apple
            </a>
          )}
          {onShowHistory && (
            <button
              onClick={() => onShowHistory(product)}
              className="w-full text-center text-xs text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors"
            >
              Historique des prix
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
