import { matchesFacets, type CatalogFilterState, type SortOption } from "./catalog-filters";
import {
  buildDealContext,
  getDealInsights,
  NOTABLE_DEAL_SCORE,
  type DealInsights,
} from "./deal-score";
import { compareProductLines, type Category } from "./product-catalog";
import { getSortableCapacityValue } from "./product-filters";
import type { Product } from "./types";

export interface FamilyGroup {
  productLine: string;
  label: string;
  available: Product[];
  expired: Product[];
}

export interface CatalogStatsSummary {
  available: number;
  newToday: number;
  priceDrops: number;
  favoritesAvailable: number;
}

export function sortProducts(
  productList: Product[],
  sort: SortOption,
  dealInsights: Map<string, DealInsights>
) {
  const result = [...productList];

  switch (sort) {
    case "best-deal":
      return result.sort(
        (a, b) =>
          (dealInsights.get(b.partNumber)?.dealScore ?? 0) -
          (dealInsights.get(a.partNumber)?.dealScore ?? 0)
      );
    case "dev-fit":
      return result.sort(
        (a, b) =>
          (dealInsights.get(b.partNumber)?.devFitScore ?? -1) -
          (dealInsights.get(a.partNumber)?.devFitScore ?? -1)
      );
    case "discount":
      return result.sort((a, b) => b.savingsPercent - a.savingsPercent);
    case "price-asc":
      return result.sort((a, b) => a.currentPrice - b.currentPrice);
    case "price-desc":
      return result.sort((a, b) => b.currentPrice - a.currentPrice);
    case "ram-desc":
      return result.sort(
        (a, b) => getSortableCapacityValue(b.memory) - getSortableCapacityValue(a.memory)
      );
    case "storage-desc":
      return result.sort(
        (a, b) => getSortableCapacityValue(b.storage) - getSortableCapacityValue(a.storage)
      );
    case "appearances-desc":
      return result.sort(
        (a, b) =>
          b.appearanceCount - a.appearanceCount ||
          new Date(b.appearanceLastSeen).getTime() - new Date(a.appearanceLastSeen).getTime()
      );
    case "newest":
      return result.sort(
        (a, b) =>
          new Date(b.appearanceFirstSeen).getTime() - new Date(a.appearanceFirstSeen).getTime()
      );
  }
}

// Meilleure affaire d'une liste, seulement si son score est assez bon pour être mis en avant.
export function pickTop(products: Product[], dealInsights: Map<string, DealInsights>) {
  const best = products.reduce<Product | null>(
    (current, product) =>
      !current ||
      (dealInsights.get(product.partNumber)?.dealScore ?? 0) >
        (dealInsights.get(current.partNumber)?.dealScore ?? 0)
        ? product
        : current,
    null
  );

  return best && (dealInsights.get(best.partNumber)?.dealScore ?? 0) >= NOTABLE_DEAL_SCORE
    ? best
    : null;
}

function groupByProductLine(products: Product[]) {
  const byLine = new Map<string, Product[]>();
  products.forEach((product) => {
    byLine.set(product.productLine, [...(byLine.get(product.productLine) ?? []), product]);
  });
  return byLine;
}

// Le score compare chaque offre disponible à l'historique de sa configuration (offres expirées
// comprises) et aux configs équivalentes disponibles en même temps.
export function buildDealInsights(available: Product[], all: Product[]) {
  const context = buildDealContext(available, all);
  return new Map(available.map((product) => [product.partNumber, getDealInsights(product, context)]));
}

export function buildFamilyGroups(args: {
  available: Product[];
  expired: Product[];
  filters: CatalogFilterState;
  dealInsights: Map<string, DealInsights>;
}): FamilyGroup[] {
  const { filters, dealInsights } = args;
  const byLine = new Map<string, FamilyGroup>();
  const matches = (product: Product) =>
    product.category === filters.category && matchesFacets(product, filters);

  const register = (product: Product, bucket: "available" | "expired") => {
    const group =
      byLine.get(product.productLine) ??
      { productLine: product.productLine, label: product.productLineLabel, available: [], expired: [] };
    group[bucket].push(product);
    byLine.set(product.productLine, group);
  };

  args.available.filter(matches).forEach((product) => register(product, "available"));
  if (filters.includeExpired) {
    args.expired.filter(matches).forEach((product) => register(product, "expired"));
  }

  return Array.from(byLine.values())
    .sort((a, b) => compareProductLines(a.productLine, b.productLine))
    .map((group) => ({
      ...group,
      available: sortProducts(group.available, filters.sort, dealInsights),
      expired: sortProducts(group.expired, filters.sort, dealInsights),
    }));
}

export function buildTopPicks(args: {
  available: Product[];
  category: Category;
  dealInsights: Map<string, DealInsights>;
  limit?: number;
}) {
  const byLine = groupByProductLine(
    args.available.filter((product) => product.category === args.category)
  );

  return Array.from(byLine.entries())
    .sort(([a], [b]) => compareProductLines(a, b))
    .flatMap(([, lineProducts]) => {
      const top = pickTop(lineProducts, args.dealInsights);
      const insights = top ? args.dealInsights.get(top.partNumber) : undefined;
      return top && insights ? [{ product: top, insights }] : [];
    })
    .slice(0, args.limit ?? 6);
}

export function buildCatalogStats(available: Product[], category: Category): CatalogStatsSummary {
  const inCategory = available.filter((product) => product.category === category);

  return {
    available: inCategory.length,
    newToday: inCategory.filter((product) => product.isNew).length,
    priceDrops: inCategory.filter((product) => product.priceTrend === "down").length,
    favoritesAvailable: inCategory.filter((product) => product.isFavorite).length,
  };
}
