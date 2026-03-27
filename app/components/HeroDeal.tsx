import type { Product } from "@/lib/types";
import { Badge } from "./Badge";

interface HeroDealProps {
  product: Product;
}

const SCREEN_LABELS: Record<string, string> = {
  "14": '14"',
  "16": '16"',
};

export function HeroDeal({ product }: HeroDealProps) {
  const discountPercent = Math.round(product.savingsPercent);
  const savingsAmount = product.originalPrice - product.currentPrice;
  const screenLabel = product.screenSize
    ? (SCREEN_LABELS[product.screenSize] ?? product.screenSize)
    : null;

  return (
    <div className="rounded-2xl border border-[var(--accent-green)]/30 bg-[var(--surface)] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="bg-[var(--accent-green)] px-4 py-2 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white">
          <path d="M12 2l2.62 5.3 5.86.85-4.24 4.13 1 5.84L12 15.7l-5.24 2.42 1-5.84L3.52 8.15l5.86-.85L12 2z" />
        </svg>
        <span className="text-[11px] font-semibold text-white uppercase tracking-wider">
          Top remise
        </span>
      </div>
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
            {screenLabel && (
              <span className="text-xs text-[var(--text-secondary)]">{screenLabel}</span>
            )}
            {product.isNew && <Badge variant="new">Nouveau</Badge>}
          </div>

          <h2 className="text-lg font-semibold leading-snug line-clamp-2">
            {product.title}
          </h2>

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
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-[var(--fg)]">
              {product.currentPrice.toLocaleString("fr-FR")} €
            </span>
            <span className="text-sm text-[var(--text-secondary)] line-through">
              {product.originalPrice.toLocaleString("fr-FR")} €
            </span>
            <Badge variant="discount">-{discountPercent}%</Badge>
          </div>

          <p className="text-sm font-medium text-[var(--accent-green)]">
            Economisez {savingsAmount.toLocaleString("fr-FR")} €
          </p>

          <div className="pt-1">
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-blue)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-blue-hover)]"
            >
              Voir sur Apple
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
