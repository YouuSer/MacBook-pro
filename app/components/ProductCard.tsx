"use client";

import {
  formatScreenSize,
  getProductLineLabel,
} from "@/lib/product-catalog";
import type { Product } from "@/lib/types";
import { Badge } from "./Badge";

interface ProductCardProps {
  product: Product;
  dealScore?: number;
  topLabel?: string;
  topReasons?: string[];
  isTopDeal?: boolean;
  isTopDiscount?: boolean;
  isExpired?: boolean;
  onShowHistory?: (product: Product) => void;
}

const COLOR_MAP: Record<string, { hex: string; label: string; textDark?: boolean }> = {
  spacegray: { hex: "#7d7e80", label: "Gris sidéral", textDark: false },
  spaceblack: { hex: "#393b3d", label: "Noir sidéral", textDark: false },
  silver: { hex: "#c0c1c4", label: "Argent", textDark: true },
  starlight: { hex: "#f3e7cf", label: "Lumière stellaire", textDark: true },
  midnight: { hex: "#1f2937", label: "Minuit", textDark: false },
  midnightblue: { hex: "#1f2937", label: "Minuit", textDark: false },
  skyblue: { hex: "#c9e3f3", label: "Bleu ciel", textDark: true },
};

export function ProductCard({
  product,
  dealScore,
  topLabel,
  topReasons = [],
  isTopDeal = false,
  isTopDiscount = false,
  isExpired = false,
  onShowHistory,
}: ProductCardProps) {
  const discountPercent = Math.round(product.savingsPercent);
  const hasDiscount =
    discountPercent >= 1 && product.currentPrice < product.originalPrice;
  const screenLabel = formatScreenSize(product.screenSize);
  const savingsAmount = product.originalPrice - product.currentPrice;
  const colorKey = product.color.trim().toLowerCase();
  const colorInfo = colorKey ? COLOR_MAP[colorKey] ?? null : null;
  const isTopAir = topLabel && product.productLine === "air";
  const topCardClasses = isTopAir
    ? "ring-2 ring-sky-500 border-sky-500/30"
    : "ring-2 ring-amber-500 border-amber-500/30";
  const topTagClasses = isTopAir
    ? "bg-sky-500 shadow-sm shadow-sky-500/30"
    : "bg-amber-500 shadow-sm shadow-amber-500/30";
  const seenAtDate = new Date(product.appearanceFirstSeen).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
  const seenAtTime = new Date(product.appearanceFirstSeen).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  const expiredAtDate = new Date(product.appearanceLastSeen).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
  const expiredAtTime = new Date(product.appearanceLastSeen).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  const appearanceLabel = `Vu le ${seenAtDate} ${seenAtTime}`;
  const expirationLabel = isExpired
    ? `Expiré le ${expiredAtDate} ${expiredAtTime}`
    : null;
  const appearanceCountLabel =
    product.appearanceCount > 1
      ? `${product.appearanceCount} apparitions`
      : null;
  const priceTrendTitle =
    product.priceTrend === "down" && product.previousPrice !== null
      ? `Prix en baisse depuis ${product.previousPrice.toLocaleString("fr-FR")} €`
      : product.priceTrend === "up" && product.previousPrice !== null
        ? `Prix en hausse depuis ${product.previousPrice.toLocaleString("fr-FR")} €`
        : null;

  return (
    <div
      className={`group flex flex-row sm:flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-all duration-200 ease-out ${
        isExpired
          ? "border-[var(--border)] opacity-70"
          : `hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${
              topLabel
                ? topCardClasses
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
        <div className="absolute left-2 right-2 top-2 sm:left-3 sm:right-3 sm:top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5 max-w-[calc(100%-64px)]">
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
                {topLabel && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-[5px] text-[11px] leading-none font-semibold text-white ${topTagClasses}`}>
                    {topLabel}
                  </span>
                )}
                {isTopDeal && (
                  <span className="inline-flex items-center rounded-full border border-zinc-900/10 bg-zinc-900/88 px-2 py-[5px] text-[11px] leading-none font-medium text-white shadow-sm shadow-zinc-900/12 dark:border-zinc-100/10 dark:bg-zinc-100/92 dark:text-[#1d1d1f] dark:shadow-zinc-100/10">
                    Top Dev
                  </span>
                )}
                {isTopDiscount && (
                  <div className="inline-flex items-center rounded-full bg-emerald-500 px-2.5 py-[5px] text-[11px] leading-none font-semibold text-white dark:bg-emerald-400">
                    Top Remise
                  </div>
                )}
              </>
            )}
          </div>
          {!isExpired && hasDiscount && (
            <div className="shrink-0">
              <Badge variant="discount">-{discountPercent}%</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 sm:p-5 space-y-2.5 sm:space-y-3 min-w-0">
        {/* Specs badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="chip">{product.chip || "—"}</Badge>
          <Badge variant="line">{getProductLineLabel(product.productLine)}</Badge>
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
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[var(--fg)]">
              {product.currentPrice.toLocaleString("fr-FR")} €
            </span>
            {priceTrendTitle && (
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                  product.priceTrend === "down"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
                title={priceTrendTitle}
                aria-label={priceTrendTitle}
              >
                {product.priceTrend === "down" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 7h10v10" />
                    <path d="M17 7 7 17" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17h10V7" />
                    <path d="m7 17 10-10" />
                  </svg>
                )}
              </span>
            )}
          </div>
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
          {typeof dealScore === "number" && (
            <span className="text-[11px] font-semibold text-[var(--text-tertiary)]" title="Score développeur : adéquation dev plus opportunité de prix">
              Score {dealScore.toFixed(0)}
            </span>
          )}
        </div>

        {topReasons.length > 0 && (
          <div className="flex items-start gap-3 text-[11px]">
            <p className="min-w-0 flex-1 line-clamp-2 text-[var(--text-secondary)]">
              {topReasons.join(" · ")}
            </p>
            <span className="ml-auto shrink-0 whitespace-nowrap text-[var(--text-tertiary)]">
              {appearanceLabel}
              {expirationLabel ? ` · ${expirationLabel}` : ""}
            </span>
          </div>
        )}

        {!topReasons.length && (
          <div className="flex text-[11px] text-[var(--text-tertiary)]">
            <span className="ml-auto">
              {appearanceLabel}
              {expirationLabel ? ` · ${expirationLabel}` : ""}
            </span>
          </div>
        )}

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
          {product.cpuCores && (
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)] shrink-0">
                <rect x="7" y="7" width="10" height="10" rx="1.5" />
                <path d="M9 2v3M15 2v3M9 19v3M15 19v3M19 9h3M19 15h3M2 9h3M2 15h3" />
              </svg>
              <span className="text-xs font-semibold">CPU {product.cpuCores} cœurs</span>
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
          {product.gpuCores && (
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)] shrink-0">
                <rect x="4" y="6" width="16" height="10" rx="2" />
                <path d="M8 18h8M12 16v2" />
                <path d="M8 10h.01M12 10h.01M16 10h.01" />
              </svg>
              <span className="text-xs font-semibold">GPU {product.gpuCores} cœurs</span>
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
              type="button"
              onClick={() => onShowHistory(product)}
              className="flex w-full items-center justify-center gap-2 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-blue)]"
            >
              <span>Historique des prix</span>
              {appearanceCountLabel && (
                <span className="text-[var(--text-tertiary)]">
                  · {appearanceCountLabel}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
