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
    <dl className="grid h-full grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col-reverse justify-center gap-1 rounded-[18px] bg-[var(--surface)] p-[18px]"
        >
          <dt className="text-xs text-[var(--text-secondary)]">{item.label}</dt>
          <dd className="text-[26px] font-semibold leading-none tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
