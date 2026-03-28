"use client";

import type { Product } from "@/lib/types";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { Badge } from "./Badge";

interface PriceHistoryPanelProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function PriceHistoryPanel({
  product,
  isOpen,
  onClose,
}: PriceHistoryPanelProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[420px] bg-[var(--surface)] shadow-[-8px_0_30px_rgb(0_0_0_/_0.1)] z-50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="text-base font-semibold">Historique des prix</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[var(--surface-secondary)] transition-colors text-[var(--text-secondary)]"
              aria-label="Fermer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6L18 18M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* Product summary */}
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-4">
            <div className="w-16 h-16 flex items-center justify-center bg-[var(--image-bg)] rounded-xl shrink-0">
              <img
                src={product.imageUrl}
                alt={product.title}
                className="h-12 object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="chip">{product.chip}</Badge>
              </div>
              <p className="text-sm font-semibold line-clamp-1">{product.title}</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base font-bold text-[var(--fg)]">
                  {product.currentPrice.toLocaleString("fr-FR")} €
                </span>
                <span className="text-xs text-[var(--text-secondary)] line-through">
                  {product.originalPrice.toLocaleString("fr-FR")} €
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 px-5 py-6 overflow-y-auto">
            <PriceHistoryChart
              source={product.source}
              productId={product.productId}
              originalPrice={product.originalPrice}
            />
          </div>
        </div>
      </div>
    </>
  );
}
