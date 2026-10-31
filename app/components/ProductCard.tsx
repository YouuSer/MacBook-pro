"use client";

import {
  formatPrice,
  getProductFootnote,
  getProductStatus,
  getShortTitle,
  getSpecLine,
  type ProductStatus,
} from "@/lib/product-display";
import type { Product } from "@/lib/types";
import { PriceSparkline } from "./PriceSparkline";

interface ProductCardProps {
  product: Product;
  isTop?: boolean;
  isExpired?: boolean;
  onOpen?: (product: Product) => void;
  canManageFavorite?: boolean;
  favoriteBusy?: boolean;
  onToggleFavorite?: () => void;
}

const STATUS_CLASSES: Record<NonNullable<ProductStatus>["kind"] | "top", string> = {
  top: "bg-[var(--badge-top-bg)] text-[var(--badge-top-fg)]",
  new: "bg-[var(--badge-new-bg)] text-[var(--badge-new-fg)]",
  drop: "bg-[var(--badge-top-bg)] text-[var(--badge-top-fg)]",
  rise: "bg-[var(--badge-muted-bg)] text-[var(--badge-muted-fg)]",
  expired: "bg-[var(--badge-muted-bg)] text-[var(--badge-muted-fg)]",
};

export function ProductCard({
  product,
  isTop = false,
  isExpired = false,
  onOpen,
  canManageFavorite = false,
  favoriteBusy = false,
  onToggleFavorite,
}: ProductCardProps) {
  const status = getProductStatus(product, isExpired);
  const badge = !isExpired && isTop ? { kind: "top" as const, label: "Meilleure affaire" } : status;
  const discountPercent = Math.round(product.savingsPercent);
  const hasDiscount = discountPercent >= 1 && product.currentPrice < product.originalPrice;
  const shortTitle = getShortTitle(product);

  return (
    <article
      className={`group relative flex flex-col gap-3 rounded-[18px] bg-[var(--surface)] p-4 transition-shadow hover:shadow-[var(--shadow-md)] ${
        isExpired ? "opacity-60 hover:opacity-90" : ""
      }`}
    >
      <div className="flex min-h-7 items-start justify-between">
        {badge ? (
          <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${STATUS_CLASSES[badge.kind]}`}>
            {badge.label}
          </span>
        ) : (
          <span />
        )}
        {canManageFavorite && onToggleFavorite ? (
          <button
            type="button"
            onClick={onToggleFavorite}
            disabled={favoriteBusy}
            aria-label={product.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            aria-pressed={product.isFavorite}
            className={`relative z-10 -m-1.5 rounded-full p-1.5 transition-colors disabled:cursor-wait disabled:opacity-60 ${
              product.isFavorite ? "text-amber-500" : "text-[var(--text-tertiary)] hover:text-amber-500"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={product.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
              <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />
            </svg>
          </button>
        ) : (
          product.isFavorite && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500" role="img" aria-label="Favori">
              <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />
            </svg>
          )
        )}
      </div>

      <div className="flex h-36 items-center justify-center rounded-[14px] bg-[var(--image-tile)]">
        <img
          src={product.imageUrl}
          alt=""
          className={`h-28 max-w-[80%] object-contain mix-blend-multiply ${isExpired ? "grayscale" : ""}`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold leading-snug">
          {onOpen ? (
            <button
              type="button"
              onClick={() => onOpen(product)}
              title={product.title}
              className="text-left after:absolute after:inset-0 after:rounded-[18px] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[var(--accent-blue)]"
            >
              {shortTitle}
            </button>
          ) : (
            shortTitle
          )}
        </h3>
        <p className="text-[13px] text-[var(--text-secondary)]">{getSpecLine(product)}</p>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-xl font-semibold tabular-nums">{formatPrice(product.currentPrice)}</span>
        {hasDiscount && (
          <>
            <span className="text-[13px] text-[var(--text-secondary)] line-through">
              {formatPrice(product.originalPrice)}
            </span>
            <span className="text-[13px] font-semibold text-[var(--accent-blue)]">−{discountPercent} %</span>
          </>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <PriceSparkline prices={product.priceSeries} muted={isExpired} />
        <p className="text-xs text-[var(--text-secondary)]">{getProductFootnote(product, isExpired)}</p>
      </div>
    </article>
  );
}
