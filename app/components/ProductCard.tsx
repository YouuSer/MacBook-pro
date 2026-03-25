"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { Badge } from "./Badge";
import { PriceHistoryChart } from "./PriceHistoryChart";

interface ProductCardProps {
  product: Product;
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

export function ProductCard({ product }: ProductCardProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--muted)] transition-colors">
      {/* Image */}
      <div className="relative bg-[#1c1c1c] p-4 flex justify-center">
        <img
          src={product.imageUrl}
          alt={product.title}
          width={200}
          height={200}
          className="object-contain h-40"
        />
        {product.isNew && (
          <div className="absolute top-3 left-3">
            <Badge variant="new">Nouveau</Badge>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge variant="discount">-{product.savingsPercent.toFixed(0)}%</Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Chip + Screen */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="chip">{product.chip}</Badge>
          {product.screenSize && (
            <span className="text-xs text-[var(--muted)]">
              {SCREEN_LABELS[product.screenSize] ?? product.screenSize}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium line-clamp-2 leading-snug">
          {product.title}
        </h3>

        {/* Specs */}
        <div className="flex gap-2 flex-wrap text-xs text-[var(--muted)]">
          {product.memory && <span>{product.memory.toUpperCase()}</span>}
          {product.storage && <span>{product.storage.toUpperCase()}</span>}
          {product.color && (
            <span>{COLOR_LABELS[product.color] ?? product.color}</span>
          )}
          {product.releaseYear && <span>{product.releaseYear}</span>}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-bold text-green-400">
            {product.currentPrice.toLocaleString("fr-FR")} €
          </span>
          <span className="text-sm text-[var(--muted)] line-through">
            {product.originalPrice.toLocaleString("fr-FR")} €
          </span>
        </div>

        <div className="text-xs text-green-400/70">{product.savings}</div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Voir sur Apple
          </a>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-[var(--muted)] hover:text-white py-2 px-3 rounded-lg border border-[var(--border)] hover:border-[var(--muted)] transition-colors"
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
