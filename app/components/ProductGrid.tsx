"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORY_DEFINITIONS,
  compareProductLines,
  type Category,
} from "@/lib/product-catalog";
import {
  buildFacetOptions,
  createDefaultFilterState,
  createEmptyFacets,
  getFacetKeysForCategory,
  matchesFacets,
  parseFilterState,
  serializeFilterState,
  SORT_OPTIONS,
  type CatalogFilterState,
  type FacetKey,
  type SortOption,
} from "@/lib/catalog-filters";
import { getFavoriteStateLabel } from "@/lib/favorites";
import { getSortableCapacityValue } from "@/lib/product-filters";
import type { FavoriteConfig, Product } from "@/lib/types";
import { getDealInsights, type DealInsights } from "@/lib/deal-score";
import { Badge } from "./Badge";
import { FavoriteDetailPanel } from "./FavoriteDetailPanel";
import { FilterSidebar } from "./FilterSidebar";
import { HeroDeal, type HeroPick } from "./HeroDeal";
import { PriceHistoryPanel } from "./PriceHistoryPanel";
import { getColorLabel, ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  unavailableProducts?: Product[];
  favoriteItems?: FavoriteConfig[];
  canManageFavorites?: boolean;
}

interface FamilyGroup {
  productLine: string;
  label: string;
  available: Product[];
  expired: Product[];
}

function getProductFavoriteActionKey(product: Product) {
  return product.favoriteId
    ? `favorite-${product.favoriteId}`
    : `product-${product.partNumber}`;
}

function getFavoriteActionKey(favorite: FavoriteConfig) {
  return `favorite-${favorite.id}`;
}

function formatFavoriteMetaDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortProducts(
  productList: Product[],
  sort: SortOption,
  dealInsights: Map<string, DealInsights>
) {
  const result = [...productList];

  switch (sort) {
    case "best-deal":
      return result.sort(
        (a, b) =>
          (dealInsights.get(b.partNumber)?.totalScore ?? 0) -
          (dealInsights.get(a.partNumber)?.totalScore ?? 0)
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

function pickTop(products: Product[], dealInsights: Map<string, DealInsights>) {
  return products.reduce<Product | null>(
    (best, product) =>
      !best ||
      (dealInsights.get(product.partNumber)?.totalScore ?? 0) >
        (dealInsights.get(best.partNumber)?.totalScore ?? 0)
        ? product
        : best,
    null
  );
}

export function ProductGrid({
  products,
  unavailableProducts = [],
  favoriteItems = [],
  canManageFavorites = false,
}: ProductGridProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<CatalogFilterState>(() => createDefaultFilterState());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<number | null>(null);
  const [favoriteActionKey, setFavoriteActionKey] = useState<string | null>(null);
  const [favoriteActionError, setFavoriteActionError] = useState<string | null>(null);
  const [, startRefreshTransition] = useTransition();

  // L'état des filtres vit dans l'URL pour être partageable et survivre au rechargement.
  useEffect(() => {
    setFilters(parseFilterState(window.location.search));
  }, []);

  useEffect(() => {
    const query = serializeFilterState(filters);
    if (window.location.search.slice(1) !== query) {
      window.history.replaceState(null, "", `?${query}`);
    }
  }, [filters]);

  const availablePartNumbers = useMemo(
    () => new Set(products.map((product) => product.partNumber)),
    [products]
  );
  const allProducts = useMemo(
    () => [...products, ...unavailableProducts],
    [products, unavailableProducts]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<Category, number>();
    products.forEach((product) =>
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1)
    );
    return counts;
  }, [products]);

  const dealInsightsByPartNumber = useMemo(() => {
    const peersByLine = new Map<string, Product[]>();
    products.forEach((product) => {
      peersByLine.set(product.productLine, [...(peersByLine.get(product.productLine) ?? []), product]);
    });

    return new Map(
      products.map((product) => [
        product.partNumber,
        getDealInsights(product, peersByLine.get(product.productLine) ?? []),
      ])
    );
  }, [products]);

  const facetGroups = useMemo(
    () =>
      buildFacetOptions({
        products: allProducts,
        isAvailable: (product) => availablePartNumbers.has(product.partNumber),
        state: filters,
        colorLabel: getColorLabel,
      }),
    [allProducts, availablePartNumbers, filters]
  );

  const activeFacetKeys = getFacetKeysForCategory(filters.category);
  const hasActiveFilters =
    filters.favoritesOnly || activeFacetKeys.some((key) => filters.facets[key].length > 0);

  const families = useMemo<FamilyGroup[]>(() => {
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

    products.filter(matches).forEach((product) => register(product, "available"));
    if (filters.includeExpired) {
      unavailableProducts.filter(matches).forEach((product) => register(product, "expired"));
    }

    return Array.from(byLine.values())
      .sort((a, b) => compareProductLines(a.productLine, b.productLine))
      .map((group) => ({
        ...group,
        available: sortProducts(group.available, filters.sort, dealInsightsByPartNumber),
        expired: sortProducts(group.expired, filters.sort, dealInsightsByPartNumber),
      }));
  }, [products, unavailableProducts, filters, dealInsightsByPartNumber]);

  const visibleAvailable = families.reduce((sum, group) => sum + group.available.length, 0);
  const visibleExpired = families.reduce((sum, group) => sum + group.expired.length, 0);

  const topDiscountPartNumber = useMemo(() => {
    const candidates = families.flatMap((group) => group.available);
    return candidates.reduce<Product | null>(
      (best, product) => (!best || product.savingsPercent > best.savingsPercent ? product : best),
      null
    )?.partNumber;
  }, [families]);

  const heroPicks = useMemo<HeroPick[]>(() => {
    const byLine = new Map<string, Product[]>();
    products
      .filter((product) => product.category === filters.category)
      .forEach((product) =>
        byLine.set(product.productLine, [...(byLine.get(product.productLine) ?? []), product])
      );

    return Array.from(byLine.entries())
      .sort(([a], [b]) => compareProductLines(a, b))
      .flatMap(([, lineProducts]) => {
        const top = pickTop(lineProducts, dealInsightsByPartNumber);
        const insights = top ? dealInsightsByPartNumber.get(top.partNumber) : undefined;

        return top && insights
          ? [{ product: top, score: insights.totalScore, reasons: insights.reasons, label: `Top ${top.productLineLabel}` }]
          : [];
      })
      .slice(0, 6);
  }, [products, filters.category, dealInsightsByPartNumber]);

  const activeFilterTags = useMemo(() => {
    const labelsByValue = new Map(
      facetGroups.flatMap((group) =>
        group.options.map((option) => [`${group.key}:${option.value}`, option.label] as const)
      )
    );

    return activeFacetKeys.flatMap((key) =>
      filters.facets[key].map((value) => ({
        key: `${key}:${value}`,
        label: labelsByValue.get(`${key}:${value}`) ?? value,
        onRemove: () => toggleFacet(key, value),
      }))
    );
  }, [facetGroups, filters]);

  function updateFilters(patch: Partial<CatalogFilterState>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function toggleFacet(key: FacetKey, value: string) {
    setFilters((current) => {
      const selected = current.facets[key];
      return {
        ...current,
        facets: {
          ...current.facets,
          [key]: selected.includes(value)
            ? selected.filter((entry) => entry !== value)
            : [...selected, value],
        },
      };
    });
  }

  function selectCategory(category: Category) {
    setFilters((current) => ({ ...current, category, facets: createEmptyFacets() }));
  }

  function clearAll() {
    updateFilters({ facets: createEmptyFacets(), favoritesOnly: false });
  }

  async function refreshAfterFavoriteAction() {
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  async function handleAddFavorite(partNumber: string) {
    setFavoriteActionKey(`product-${partNumber}`);
    setFavoriteActionError(null);

    try {
      const response = await fetch("/api/admin/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ partNumber }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Ajout du favori impossible.");
      }

      await refreshAfterFavoriteAction();
    } catch (error) {
      setFavoriteActionError(
        error instanceof Error ? error.message : "Ajout du favori impossible."
      );
    } finally {
      setFavoriteActionKey(null);
    }
  }

  async function handleRemoveFavorite(favoriteId: number) {
    setFavoriteActionKey(`favorite-${favoriteId}`);
    setFavoriteActionError(null);

    try {
      const response = await fetch(`/api/admin/favorites/${favoriteId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Suppression du favori impossible.");
      }

      await refreshAfterFavoriteAction();
    } catch (error) {
      setFavoriteActionError(
        error instanceof Error ? error.message : "Suppression du favori impossible."
      );
    } finally {
      setFavoriteActionKey(null);
    }
  }

  async function handleToggleProductFavorite(product: Product) {
    if (!canManageFavorites) {
      return;
    }

    if (product.favoriteId) {
      await handleRemoveFavorite(product.favoriteId);
      return;
    }

    await handleAddFavorite(product.partNumber);
  }

  const sidebar = (
    <FilterSidebar
      groups={facetGroups}
      selected={filters.facets}
      onToggle={toggleFacet}
      favoritesOnly={filters.favoritesOnly}
      onToggleFavoritesOnly={() => updateFilters({ favoritesOnly: !filters.favoritesOnly })}
      includeExpired={filters.includeExpired}
      onToggleIncludeExpired={() => updateFilters({ includeExpired: !filters.includeExpired })}
      hasActiveFilters={hasActiveFilters}
      onClearAll={clearAll}
    />
  );

  const renderCard = (product: Product, isExpired: boolean, topPartNumber?: string) => {
    const insights = dealInsightsByPartNumber.get(product.partNumber);
    const isTop = !isExpired && product.partNumber === topPartNumber;

    return (
      <ProductCard
        key={product.partNumber}
        product={product}
        isExpired={isExpired}
        dealScore={isExpired ? undefined : insights?.totalScore}
        topLabel={isTop ? `Top ${product.productLineLabel}` : undefined}
        topReasons={isTop ? insights?.reasons : undefined}
        isTopDiscount={!isExpired && product.partNumber === topDiscountPartNumber}
        onShowHistory={setHistoryProduct}
        canManageFavorite={canManageFavorites}
        favoriteBusy={favoriteActionKey === getProductFavoriteActionKey(product)}
        onToggleFavorite={() => void handleToggleProductFavorite(product)}
      />
    );
  };

  return (
    <>
      <nav
        aria-label="Catégories"
        className="sticky top-14 z-40 -mx-4 mb-6 flex gap-1.5 overflow-x-auto border-b border-[var(--border)]/50 bg-[var(--bg)]/85 px-4 py-3 backdrop-blur-xl"
      >
        {CATEGORY_DEFINITIONS.map((definition) => {
          const isActive = filters.category === definition.id;
          const count = categoryCounts.get(definition.id) ?? 0;

          return (
            <button
              key={definition.id}
              type="button"
              onClick={() => selectCategory(definition.id)}
              aria-pressed={isActive}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--fg)] text-[var(--bg)]"
                  : "text-[var(--fg)] hover:bg-[var(--surface)]"
              }`}
            >
              {definition.label}
              <span className={`text-xs tabular-nums ${isActive ? "opacity-70" : "text-[var(--text-secondary)]"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {favoriteActionError && (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {favoriteActionError}
        </div>
      )}

      {favoriteItems.length > 0 && (
        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--fg)]">Favoris</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Suivi multi-apparitions et historique agrégé par configuration.
              </p>
            </div>
            <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
              {favoriteItems.length} favori{favoriteItems.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {favoriteItems.map((favorite) => {
              const metaDate =
                formatFavoriteMetaDate(
                  favorite.currentState === "available"
                    ? favorite.lastMatchedAt
                    : favorite.lastEventAt
                ) ?? "—";
              const isBusy = favoriteActionKey === getFavoriteActionKey(favorite);

              return (
                <div
                  key={favorite.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedFavoriteId(favorite.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedFavoriteId(favorite.id);
                    }
                  }}
                  className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-md)]"
                >
                  <div className="absolute right-4 top-4 flex items-center gap-2">
                    <Badge variant="favorite">Favori</Badge>
                    {canManageFavorites && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleRemoveFavorite(favorite.id);
                        }}
                        disabled={isBusy}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-amber-500 transition-colors hover:border-[var(--border-hover)] hover:text-amber-600 disabled:cursor-wait disabled:opacity-60"
                        aria-label="Retirer des favoris"
                      >
                        {isBusy ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-start gap-4">
                    {favorite.imageUrl && (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--image-bg)]">
                        <img
                          src={favorite.imageUrl}
                          alt={favorite.label}
                          className="h-16 object-contain"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            favorite.currentState === "available"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-neutral-500/10 text-[var(--text-secondary)]"
                          }`}
                        >
                          {getFavoriteStateLabel(favorite.currentState)}
                        </span>
                        <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                          {favorite.currentMatchCount} SKU actif
                          {favorite.currentMatchCount > 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm font-semibold text-[var(--fg)]">
                        {favorite.label}
                      </p>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {favorite.currentState === "available"
                              ? "Meilleur prix actuel"
                              : "Dernier événement"}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[var(--fg)]">
                            {favorite.bestCurrentPrice === null
                              ? "—"
                              : `${favorite.bestCurrentPrice.toLocaleString("fr-FR")} €`}
                          </p>
                        </div>
                        <p className="text-right text-xs text-[var(--text-tertiary)]">
                          {metaDate}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!hasActiveFilters && heroPicks.length > 0 && (
        <div className="mb-8">
          <HeroDeal key={filters.category} picks={heroPicks} />
        </div>
      )}

      <div className="flex items-start gap-8">
        <aside aria-label="Filtres" className="sticky top-32 hidden max-h-[calc(100vh-9rem)] w-60 shrink-0 overflow-y-auto pb-8 lg:block">
          {sidebar}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm lg:hidden"
            >
              Filtres
              {activeFilterTags.length > 0 && (
                <span className="rounded-full bg-[var(--accent-blue)] px-1.5 text-xs text-white">
                  {activeFilterTags.length}
                </span>
              )}
            </button>
            <span className="text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--fg)]">{visibleAvailable}</span> disponible
              {visibleAvailable > 1 ? "s" : ""}
              {filters.includeExpired && ` · ${visibleExpired} expirée${visibleExpired > 1 ? "s" : ""}`}
            </span>
            {activeFilterTags.map((tag) => (
              <button
                key={tag.key}
                type="button"
                onClick={tag.onRemove}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-blue)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent-blue)]"
                aria-label={`Retirer ${tag.label}`}
              >
                {tag.label} <span aria-hidden>×</span>
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              Trier par
              <select
                value={filters.sort}
                onChange={(event) => updateFilters({ sort: event.target.value as SortOption })}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--fg)] focus:border-[var(--accent-blue)] focus:outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {families.length === 0 ? (
            <div className="py-20 text-center">
              <p className="mb-3 text-base text-[var(--text-secondary)]">
                {hasActiveFilters
                  ? "Aucune offre ne correspond à vos filtres"
                  : "Aucune offre reconditionnée dans cette catégorie pour le moment"}
              </p>
              {hasActiveFilters && (
                <button onClick={clearAll} className="text-sm text-[var(--accent-blue)] hover:underline">
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {families.map((group) => {
                const topPartNumber = pickTop(group.available, dealInsightsByPartNumber)?.partNumber;

                return (
                  <section key={group.productLine} aria-labelledby={`family-${group.productLine}`}>
                    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 id={`family-${group.productLine}`} className="text-2xl font-semibold tracking-tight">
                        {group.label}
                      </h2>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {group.available.length} disponible{group.available.length > 1 ? "s" : ""}
                        {group.expired.length > 0 &&
                          ` · ${group.expired.length} expirée${group.expired.length > 1 ? "s" : ""}`}
                      </span>
                    </div>

                    {group.available.length > 0 && (
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {group.available.map((product) => renderCard(product, false, topPartNumber))}
                      </div>
                    )}

                    {group.expired.length > 0 && (
                      <details
                        key={`${group.productLine}-${hasActiveFilters}`}
                        open={hasActiveFilters || group.available.length === 0}
                        className="group/expired mt-4"
                      >
                        <summary className="cursor-pointer list-none text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--fg)]">
                          <span className="inline-block transition-transform group-open/expired:rotate-90" aria-hidden>›</span>{" "}
                          Offres expirées ({group.expired.length})
                        </summary>
                        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                          {group.expired.map((product) => renderCard(product, true))}
                        </div>
                      </details>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filtres">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fermer les filtres"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[var(--bg)] px-4 pb-6 pt-5">
            {sidebar}
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="sticky bottom-0 mt-6 w-full rounded-xl bg-[var(--accent-blue)] py-3.5 text-base font-semibold text-white"
            >
              Voir {visibleAvailable + (filters.includeExpired ? visibleExpired : 0)} offres
            </button>
          </div>
        </div>
      )}

      {historyProduct && (
        <PriceHistoryPanel
          product={historyProduct}
          isOpen={Boolean(historyProduct)}
          onClose={() => setHistoryProduct(null)}
        />
      )}

      {selectedFavoriteId !== null && (
        <FavoriteDetailPanel
          favoriteId={selectedFavoriteId}
          isOpen={selectedFavoriteId !== null}
          onClose={() => setSelectedFavoriteId(null)}
        />
      )}
    </>
  );
}
