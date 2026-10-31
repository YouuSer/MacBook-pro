"use client";

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  buildFacetOptions,
  getFacetKeysForCategory,
} from "@/lib/catalog-filters";
import {
  buildCatalogStats,
  buildDealInsights,
  buildFamilyGroups,
  buildTopPicks,
  pickTop,
} from "@/lib/catalog-view";
import { getCategoryDefinition, type Category } from "@/lib/product-catalog";
import { getColorLabel } from "@/lib/product-display";
import type { FavoriteConfig, Product } from "@/lib/types";
import { CatalogStats } from "./CatalogStats";
import { CatalogToolbar } from "./CatalogToolbar";
import { CategoryNav } from "./CategoryNav";
import { DetailPanel, type DetailTarget } from "./DetailPanel";
import { FamilySection } from "./FamilySection";
import { FavoritesSection } from "./FavoritesSection";
import { FilterSidebar } from "./FilterSidebar";
import { HeroDeal, type HeroPick } from "./HeroDeal";
import { ProductCard } from "./ProductCard";
import { SiteHeader } from "./SiteHeader";
import { useCatalogFilters } from "./useCatalogFilters";

interface ProductGridProps {
  products: Product[];
  unavailableProducts?: Product[];
  favoriteItems?: FavoriteConfig[];
  canManageFavorites?: boolean;
  headerActions: ReactNode;
}

function getProductFavoriteActionKey(product: Product) {
  return product.favoriteId
    ? `favorite-${product.favoriteId}`
    : `product-${product.partNumber}`;
}

export function ProductGrid({
  products,
  unavailableProducts = [],
  favoriteItems = [],
  canManageFavorites = false,
  headerActions,
}: ProductGridProps) {
  const router = useRouter();
  const {
    filters,
    updateFilters,
    toggleFacet,
    selectCategory,
    clearAll,
    hasActiveFilters,
  } = useCatalogFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [favoriteActionKey, setFavoriteActionKey] = useState<string | null>(
    null,
  );
  const [favoriteActionError, setFavoriteActionError] = useState<string | null>(
    null,
  );
  const [, startRefreshTransition] = useTransition();
  const closeDetail = useCallback(() => setDetailTarget(null), []);
  const openProduct = useCallback(
    (product: Product) => setDetailTarget({ kind: "product", product }),
    [],
  );

  const availablePartNumbers = useMemo(
    () => new Set(products.map((product) => product.partNumber)),
    [products],
  );
  const allProducts = useMemo(
    () => [...products, ...unavailableProducts],
    [products, unavailableProducts],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<Category, number>();
    products.forEach((product) =>
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1),
    );
    return counts;
  }, [products]);
  const dealInsights = useMemo(
    () => buildDealInsights(products, allProducts),
    [products, allProducts]
  );

  const facetGroups = useMemo(
    () =>
      buildFacetOptions({
        products: allProducts,
        isAvailable: (product) => availablePartNumbers.has(product.partNumber),
        state: filters,
        colorLabel: getColorLabel,
      }),
    [allProducts, availablePartNumbers, filters],
  );

  const families = useMemo(
    () =>
      buildFamilyGroups({
        available: products,
        expired: unavailableProducts,
        filters,
        dealInsights,
      }),
    [products, unavailableProducts, filters, dealInsights],
  );

  const visibleAvailable = families.reduce(
    (sum, group) => sum + group.available.length,
    0,
  );
  const visibleExpired = families.reduce(
    (sum, group) => sum + group.expired.length,
    0,
  );

  const topPartNumbers = useMemo(
    () =>
      new Set(
        families.flatMap((group) => {
          const top = pickTop(group.available, dealInsights);
          return top ? [top.partNumber] : [];
        }),
      ),
    [families, dealInsights],
  );

  const heroPicks = useMemo<HeroPick[]>(
    () =>
      buildTopPicks({
        available: products,
        category: filters.category,
        dealInsights,
      }).map(({ product, insights }) => ({
        product,
        score: insights.dealScore,
        reasons: insights.reasons,
        label: `Top ${product.productLineLabel}`,
      })),
    [products, filters.category, dealInsights],
  );

  const stats = useMemo(
    () => buildCatalogStats(products, filters.category),
    [products, filters.category],
  );

  const activeFilterTags = useMemo(() => {
    const labelsByValue = new Map(
      facetGroups.flatMap((group) =>
        group.options.map(
          (option) => [`${group.key}:${option.value}`, option.label] as const,
        ),
      ),
    );

    return getFacetKeysForCategory(filters.category).flatMap((key) =>
      filters.facets[key].map((value) => ({
        key: `${key}:${value}`,
        label: labelsByValue.get(`${key}:${value}`) ?? value,
        onRemove: () => toggleFacet(key, value),
      })),
    );
  }, [facetGroups, filters, toggleFacet]);

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
        error instanceof Error ? error.message : "Ajout du favori impossible.",
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
        error instanceof Error
          ? error.message
          : "Suppression du favori impossible.",
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
      onToggleFavoritesOnly={() =>
        updateFilters({ favoritesOnly: !filters.favoritesOnly })
      }
      includeExpired={filters.includeExpired}
      onToggleIncludeExpired={() =>
        updateFilters({ includeExpired: !filters.includeExpired })
      }
      hasActiveFilters={hasActiveFilters}
      onClearAll={clearAll}
    />
  );

  const renderCard = (product: Product, isExpired: boolean) => (
    <ProductCard
      key={product.partNumber}
      product={product}
      isExpired={isExpired}
      isTop={!isExpired && topPartNumbers.has(product.partNumber)}
      onOpen={openProduct}
      canManageFavorite={canManageFavorites}
      favoriteBusy={favoriteActionKey === getProductFavoriteActionKey(product)}
      onToggleFavorite={() => void handleToggleProductFavorite(product)}
    />
  );

  const categoryLabel = getCategoryDefinition(filters.category).label;

  return (
    <>
      <SiteHeader actions={headerActions}>
        <CategoryNav
          active={filters.category}
          counts={categoryCounts}
          onSelect={selectCategory}
        />
        <label className="hidden h-9 w-56 shrink-0 items-center gap-2 rounded-[10px] bg-[var(--surface-secondary)] px-3 focus-within:ring-2 focus-within:ring-[var(--accent-blue)] md:flex xl:w-64">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 text-[var(--text-secondary)]"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => updateFilters({ query: event.target.value })}
            placeholder="Rechercher (ex. M4 Pro 24 Go)"
            aria-label="Rechercher une offre"
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </label>
      </SiteHeader>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8">
        <label className="mb-6 flex h-11 items-center gap-2 rounded-xl bg-[var(--surface)] px-4 focus-within:ring-2 focus-within:ring-[var(--accent-blue)] md:hidden">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 text-[var(--text-secondary)]"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => updateFilters({ query: event.target.value })}
            placeholder="Rechercher (ex. M4 Pro 24 Go)"
            aria-label="Rechercher une offre"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </label>

        {favoriteActionError && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {favoriteActionError}
          </div>
        )}

        <FavoritesSection
          favorites={favoriteItems}
          canManage={canManageFavorites}
          busyKey={favoriteActionKey}
          onOpen={(favoriteId) =>
            setDetailTarget({ kind: "favorite", favoriteId })
          }
          onRemove={(favoriteId) => void handleRemoveFavorite(favoriteId)}
        />

        {!hasActiveFilters && (
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-stretch">
            {heroPicks.length > 0 && (
              <div className="min-w-0 lg:flex-[2]">
                <HeroDeal
                  key={filters.category}
                  picks={heroPicks}
                  categoryLabel={categoryLabel}
                  onOpen={openProduct}
                />
              </div>
            )}
            <div className="lg:flex-1">
              <CatalogStats stats={stats} categoryLabel={categoryLabel} />
            </div>
          </div>
        )}

        <div className="flex items-start gap-8">
          <aside
            aria-label="Filtres"
            className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-60 shrink-0 overflow-y-auto pb-8 lg:block"
          >
            {sidebar}
          </aside>

          <div className="min-w-0 flex-1">
            <CatalogToolbar
              sort={filters.sort}
              onSortChange={(sort) => updateFilters({ sort })}
              availableCount={visibleAvailable}
              expiredCount={filters.includeExpired ? visibleExpired : null}
              tags={activeFilterTags}
              onOpenFilters={() => setFiltersOpen(true)}
            />

            {families.length === 0 ? (
              <div className="py-20 text-center">
                <p className="mb-3 text-base text-[var(--text-secondary)]">
                  {hasActiveFilters
                    ? "Aucune offre ne correspond à vos filtres"
                    : "Aucune offre reconditionnée dans cette catégorie pour le moment"}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="text-sm text-[var(--accent-blue)] hover:underline"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-12">
                {families.map((group) => (
                  <FamilySection
                    key={group.productLine}
                    group={group}
                    expandExpired={hasActiveFilters}
                    renderCard={renderCard}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {filtersOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filtres"
        >
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
              Voir{" "}
              {visibleAvailable + (filters.includeExpired ? visibleExpired : 0)}{" "}
              offres
            </button>
          </div>
        </div>
      )}

      <DetailPanel target={detailTarget} onClose={closeDetail} />
    </>
  );
}
