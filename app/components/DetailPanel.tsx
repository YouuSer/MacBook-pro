"use client";

import { useEffect } from "react";
import type { Product } from "@/lib/types";
import { Badge } from "./Badge";
import { FavoriteDetailContent } from "./FavoriteDetailContent";
import { PriceHistoryChart } from "./PriceHistoryChart";

export type DetailTarget =
  | { kind: "product"; product: Product }
  | { kind: "favorite"; favoriteId: number };

interface DetailPanelProps {
  target: DetailTarget | null;
  onClose: () => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Panneau latéral unique : fiche produit (historique de prix, apparitions, lien Apple)
// et, si la configuration est suivie, le détail du favori en dessous.
export function DetailPanel({ target, onClose }: DetailPanelProps) {
  const isOpen = target !== null;
  const product = target?.kind === "product" ? target.product : null;
  const favoriteId =
    target?.kind === "favorite" ? target.favoriteId : product?.favoriteId ?? null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/30 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={product ? product.title : "Favori"}
        className={`fixed inset-y-0 right-0 z-[70] w-full bg-[var(--surface)] shadow-[-8px_0_30px_rgb(0_0_0_/_0.1)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:w-[500px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h3 className="text-base font-semibold">{product ? "Détail de l'offre" : "Favori"}</h3>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)]"
              aria-label="Fermer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6L18 18M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            {product && (
              <>
                <section className="flex items-start gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--image-bg)]">
                    <img src={product.imageUrl} alt={product.title} className="h-16 object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      {product.chip && <Badge variant="chip">{product.chip}</Badge>}
                      <Badge variant="line">{product.productLineLabel}</Badge>
                      {product.isFavorite && <Badge variant="favorite">Favori</Badge>}
                    </div>
                    <p className="text-sm font-semibold">{product.title}</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-lg font-bold">
                        {product.currentPrice.toLocaleString("fr-FR")} €
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] line-through">
                        {product.originalPrice.toLocaleString("fr-FR")} €
                      </span>
                    </div>
                  </div>
                </section>

                <dl className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-[var(--surface-secondary)] px-3 py-3">
                    <dt className="text-[11px] text-[var(--text-secondary)]">Apparitions</dt>
                    <dd className="mt-1 text-base font-semibold">{product.appearanceCount}</dd>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-secondary)] px-3 py-3">
                    <dt className="text-[11px] text-[var(--text-secondary)]">Première</dt>
                    <dd className="mt-1 text-sm font-semibold">{formatDate(product.appearanceFirstSeen)}</dd>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-secondary)] px-3 py-3">
                    <dt className="text-[11px] text-[var(--text-secondary)]">Dernière</dt>
                    <dd className="mt-1 text-sm font-semibold">{formatDate(product.lastSeen)}</dd>
                  </div>
                </dl>

                <section>
                  <h4 className="mb-3 text-sm font-semibold">Historique des prix</h4>
                  <PriceHistoryChart
                    partNumber={product.partNumber}
                    originalPrice={product.originalPrice}
                  />
                </section>

                {product.productUrl && (
                  <a
                    href={product.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-full bg-[var(--accent-blue)] px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[var(--accent-blue-hover)]"
                  >
                    Voir sur Apple
                  </a>
                )}
              </>
            )}

            {favoriteId !== null && (
              <section className={product ? "border-t border-[var(--border)] pt-6" : ""}>
                {product && <h4 className="mb-4 text-sm font-semibold">Suivi du favori</h4>}
                <FavoriteDetailContent key={favoriteId} favoriteId={favoriteId} showSummary={!product} />
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
