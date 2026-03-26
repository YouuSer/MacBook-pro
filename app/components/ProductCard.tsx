"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { Badge } from "./Badge";
import { PriceHistoryChart } from "./PriceHistoryChart";

interface ProductCardProps {
  product: Product;
  specDiffFlags: SpecDiffFlags;
}

export interface SpecDiffFlags {
  chip: boolean;
  memory: boolean;
  storage: boolean;
  screen: boolean;
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

const UNKNOWN_SPEC = "—";

function toUpperValue(value: string): string {
  const clean = value.trim();
  return clean ? clean.toUpperCase() : UNKNOWN_SPEC;
}

function toTextValue(value: string, fallback = UNKNOWN_SPEC): string {
  const clean = value.trim();
  return clean || fallback;
}

function normalizeScreenSize(value: string): string {
  const match = value.trim().match(/\d+/);
  return match ? match[0] : "";
}

function SpecRailRow({
  label,
  value,
  diff,
}: {
  label: string;
  value: string;
  diff: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-subtle)]">
        {label}
      </span>
      <span
        className={`inline-flex min-w-[72px] justify-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
          diff
            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function ProductCard({ product, specDiffFlags }: ProductCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const chipValue = toTextValue(product.chip, "Inconnu");
  const memoryValue = toUpperValue(product.memory);
  const storageValue = toUpperValue(product.storage);
  const normalizedScreenSize = normalizeScreenSize(product.screenSize);
  const screenValue = normalizedScreenSize
    ? SCREEN_LABELS[normalizedScreenSize] ?? normalizedScreenSize
    : UNKNOWN_SPEC;
  const colorValue = product.color ? COLOR_LABELS[product.color] ?? product.color : null;
  const releaseYear = toTextValue(product.releaseYear, "");

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_2px_8px_rgb(18_26_35_/_0.06)] transition-all hover:-translate-y-0.5 hover:border-[var(--accent-soft)] hover:shadow-[0_12px_24px_rgb(18_26_35_/_0.12)]">
      <div className="relative flex justify-center bg-[var(--image-bg)] p-4">
        <img
          src={product.imageUrl}
          alt={product.title}
          width={200}
          height={200}
          className="h-40 object-contain"
        />
        <div className="absolute top-3 right-3 rounded-full ring-2 ring-white/90 dark:ring-slate-900/80">
          <Badge variant="discount">-{product.savingsPercent.toFixed(0)}%</Badge>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-1.5">
          {product.isNew && <Badge variant="new">Nouveau</Badge>}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            {product.title}
          </h3>

          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-[var(--text-subtle)]">
            {colorValue && <span>{colorValue}</span>}
            {releaseYear && <span>{releaseYear}</span>}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
          <div className="space-y-2">
            <SpecRailRow label="Puce" value={chipValue} diff={specDiffFlags.chip} />
            <SpecRailRow label="Memoire" value={memoryValue} diff={specDiffFlags.memory} />
            <SpecRailRow label="Stockage" value={storageValue} diff={specDiffFlags.storage} />
            <SpecRailRow label="Ecran" value={screenValue} diff={specDiffFlags.screen} />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-bold text-[var(--accent)]">
              {product.currentPrice.toLocaleString("fr-FR")} €
            </span>
            <span className="text-sm text-[var(--text-subtle)] line-through">
              {product.originalPrice.toLocaleString("fr-FR")} €
            </span>
          </div>
          <div className="text-xs text-[var(--text-subtle)]">{product.savings}</div>
        </div>

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
