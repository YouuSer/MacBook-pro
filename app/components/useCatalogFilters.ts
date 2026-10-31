"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createDefaultFilterState,
  createEmptyFacets,
  getFacetKeysForCategory,
  parseFilterState,
  serializeFilterState,
  type CatalogFilterState,
  type FacetKey,
} from "@/lib/catalog-filters";
import type { Category } from "@/lib/product-catalog";

// L'état des filtres vit dans l'URL pour être partageable et survivre au rechargement.
export function useCatalogFilters() {
  const [filters, setFilters] = useState<CatalogFilterState>(() => createDefaultFilterState());

  useEffect(() => {
    setFilters(parseFilterState(window.location.search));
  }, []);

  useEffect(() => {
    const query = serializeFilterState(filters);
    if (window.location.search.slice(1) !== query) {
      window.history.replaceState(null, "", `?${query}`);
    }
  }, [filters]);

  const updateFilters = useCallback((patch: Partial<CatalogFilterState>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const toggleFacet = useCallback((key: FacetKey, value: string) => {
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
  }, []);

  const selectCategory = useCallback((category: Category) => {
    setFilters((current) => ({ ...current, category, facets: createEmptyFacets() }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters((current) => ({
      ...current,
      facets: createEmptyFacets(),
      favoritesOnly: false,
      query: "",
    }));
  }, []);

  const hasActiveFilters =
    filters.favoritesOnly ||
    filters.query.trim() !== "" ||
    getFacetKeysForCategory(filters.category).some((key) => filters.facets[key].length > 0);

  return { filters, updateFilters, toggleFacet, selectCategory, clearAll, hasActiveFilters };
}
