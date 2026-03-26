import type { Product } from "@/lib/types";

interface StatsBarProps {
  products: Product[];
  lastScrapedAt: string | null;
}

export function StatsBar({ products, lastScrapedAt }: StatsBarProps) {
  const total = products.length;
  const avgDiscount =
    total > 0
      ? products.reduce((sum, p) => sum + p.savingsPercent, 0) / total
      : 0;
  const newCount = products.filter((p) => p.isNew).length;
  const bestDeal = total > 0
    ? products.reduce((best, p) =>
        p.savingsPercent > best.savingsPercent ? p : best
      )
    : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard label="Produits dispo" value={total.toString()} />
      <StatCard
        label="Discount moyen"
        value={`${avgDiscount.toFixed(1)}%`}
        accent
      />
      <StatCard
        label="Nouveaux (24h)"
        value={newCount.toString()}
        highlight={newCount > 0}
      />
      <StatCard
        label="Meilleur deal"
        value={bestDeal ? `-${bestDeal.savingsPercent.toFixed(0)}%` : "—"}
        subtitle={bestDeal ? bestDeal.chip : undefined}
        accent
      />
      {lastScrapedAt && (
        <div className="col-span-2 md:col-span-4 text-xs text-[var(--muted)] text-right">
          Dernier scan : {new Date(lastScrapedAt).toLocaleString("fr-FR")}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="text-xs text-[var(--muted)] mb-1">{label}</div>
      <div
        className={`text-2xl font-bold ${
          highlight
            ? "text-blue-400"
            : accent
              ? "text-green-400"
              : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-[var(--muted)] mt-1">{subtitle}</div>
      )}
    </div>
  );
}
