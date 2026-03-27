"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { Badge } from "./Badge";
import { PriceHistoryChart } from "./PriceHistoryChart";

interface ProductCardProps {
  product: Product;
  isBestDeal?: boolean;
}

const SCREEN_LABELS: Record<string, string> = {
  "14": '14"',
  "16": '16"',
};

const COLOR_LABELS: Record<string, string> = {
  spacegray: "Gris sidéral",
  spaceblack: "Noir sidéral",
  silver: "Argent",
  midnightblue: "Minuit",
};

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-subtle)]">
        {label}
      </span>
      <span className="text-xs font-semibold text-[var(--foreground)]">
        {value}
      </span>
    </div>
  );
}

export function ProductCard({
  product,
  isBestDeal = false,
}: ProductCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const discountPercent = Math.round(product.savingsPercent);
  const hasDiscount =
    discountPercent >= 1 && product.currentPrice < product.originalPrice;
  const screenLabel = product.screenSize
    ? (SCREEN_LABELS[product.screenSize] ?? product.screenSize)
    : null;
  const colorLabel = product.color
    ? (COLOR_LABELS[product.color] ?? product.color)
    : null;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-[0_2px_8px_rgb(18_26_35_/_0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgb(18_26_35_/_0.12)] ${
        isBestDeal
          ? "border-emerald-500/75 shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_2px_8px_rgb(18_26_35_/_0.06)] hover:border-emerald-500"
          : "border-[var(--border)] hover:border-[var(--accent-soft)]"
      }`}
    >
      {/* Image */}
      <div className="relative flex justify-center bg-[var(--image-bg)] p-4">
        <img
          src={product.imageUrl}
          alt={product.title}
          width={200}
          height={200}
          className="h-40 object-contain"
        />
        {isBestDeal && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/65 bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm shadow-emerald-500/35">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2l2.62 5.3 5.86.85-4.24 4.13 1 5.84L12 15.7l-5.24 2.42 1-5.84L3.52 8.15l5.86-.85L12 2z" />
            </svg>
            <span>Meilleur deal</span>
          </div>
        )}
        {product.isNew && (
          <div className="absolute top-3 left-3">
            <Badge variant="new">Nouveau</Badge>
          </div>
        )}
        {hasDiscount && (
          <div className="absolute top-3 right-3 rounded-full ring-2 ring-white/90 dark:ring-slate-900/80">
            <Badge variant="discount">-{discountPercent}%</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {product.title}
        </h3>

        {/* Specs */}
        <div className="space-y-1.5">
          <SpecRow label="Puce" value={product.chip || "—"} />
          {product.memory && <SpecRow label="Mémoire" value={product.memory.toUpperCase()} />}
          {product.storage && <SpecRow label="Stockage" value={product.storage.toUpperCase()} />}
          {screenLabel && <SpecRow label="Écran" value={screenLabel} />}
          {colorLabel && <SpecRow label="Couleur" value={colorLabel} />}
          {product.releaseYear && <SpecRow label="Année" value={product.releaseYear} />}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-bold text-[var(--accent)]">
            {product.currentPrice.toLocaleString("fr-FR")} €
          </span>
          {hasDiscount && (
            <span className="text-sm text-[var(--text-subtle)] line-through">
              {product.originalPrice.toLocaleString("fr-FR")} €
            </span>
          )}
        </div>

        <div className="text-xs text-[var(--text-subtle)]">{product.savings}</div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-lg bg-[#0071e3] px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-[#0077ed]"
          >
            Voir sur Apple
          </a>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-sm text-sky-600 transition-colors hover:border-sky-500 hover:bg-sky-500/15 hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
          >
            {showHistory ? "Masquer" : "Historique"}
          </button>
        </div>

        {/* Price History */}
        {showHistory && (
          <PriceHistoryChart
            partNumber={product.partNumber}
            originalPrice={product.originalPrice}
          />
        )}
      </div>
    </div>
  );
}
