import type { CatalogStatsSummary } from "@/lib/catalog-view";

interface CatalogStatsProps {
  stats: CatalogStatsSummary;
  categoryLabel: string;
}

export function CatalogStats({ stats, categoryLabel }: CatalogStatsProps) {
  const items = [
    { value: stats.available, label: `${categoryLabel} disponible${stats.available > 1 ? "s" : ""}` },
    { value: stats.newToday, label: "Nouveautés 24 h" },
    { value: stats.priceDrops, label: "Baisses de prix" },
    { value: stats.favoritesAvailable, label: "Favoris dispo" },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 shadow-[var(--shadow-sm)]"
        >
          <dd className="text-2xl font-semibold tabular-nums">{item.value}</dd>
          <dt className="text-xs text-[var(--text-secondary)]">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}
