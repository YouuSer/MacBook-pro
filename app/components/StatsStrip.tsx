import type { Product } from "@/lib/types";

interface StatsStripProps {
  products: Product[];
}

export function StatsStrip({ products }: StatsStripProps) {
  const total = products.length;
  const avgDiscount =
    total > 0
      ? products.reduce((sum, p) => sum + p.savingsPercent, 0) / total
      : 0;
  const newCount = products.filter((p) => p.isNew).length;

  return (
    <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] py-3">
      <span>
        <span className="font-semibold text-[var(--fg)]">{total}</span> disponible{total !== 1 ? "s" : ""}
      </span>
      <span className="text-[var(--border)]" aria-hidden>·</span>
      <span>
        Moy. <span className="font-semibold text-[var(--accent-green)]">-{avgDiscount.toFixed(0)}%</span>
      </span>
      {newCount > 0 && (
        <>
          <span className="text-[var(--border)]" aria-hidden>·</span>
          <span>
            <span className="font-semibold text-[var(--accent-orange)]">{newCount}</span> nouveau{newCount !== 1 ? "x" : ""} (24h)
          </span>
        </>
      )}
    </div>
  );
}
