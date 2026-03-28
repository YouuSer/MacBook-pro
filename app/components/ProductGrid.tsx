"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { FilterBar, type SortOption } from "./FilterBar";
import { PriceHistoryPanel } from "./PriceHistoryPanel";
import { HeroDeal } from "./HeroDeal";
import { StatsStrip } from "./StatsStrip";
import { computeDealScore } from "@/lib/deal-score";

interface ProductGridProps {
  products: Product[];
  unavailableProducts?: Product[];
}

const SOURCE_LABELS: Record<string, string> = {
  apple_refurb: "Apple Refurb",
  amazon: "Amazon",
};

function normalizeScreenSize(value: string): string {
  const match = value.trim().match(/\d+/);
  return match ? match[0] : "";
}

function normalizeSpecValue(value: string): string {
  return value.trim().toUpperCase();
}

function toCapacityValue(value: string): number {
  const normalized = normalizeSpecValue(value).replace(",", ".");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(TB|GB)/);
  if (match) {
    const amount = parseFloat(match[1]);
    return match[2] === "TB" ? amount * 1024 : amount;
  }

  const fallback = normalized.match(/(\d+(?:\.\d+)?)/);
  return fallback ? parseFloat(fallback[1]) : Number.POSITIVE_INFINITY;
}

function sortSpecValues(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const aCapacity = toCapacityValue(a);
    const bCapacity = toCapacityValue(b);

    if (
      Number.isFinite(aCapacity) &&
      Number.isFinite(bCapacity) &&
      aCapacity !== bCapacity
    ) {
      return aCapacity - bCapacity;
    }

    return a.localeCompare(b, "fr", { numeric: true });
  });
}

const SCREEN_LABELS: Record<string, string> = {
  "14": '14"',
  "16": '16"',
};

function productKey(p: Product): string {
  return `${p.source}:${p.productId}`;
}

export function ProductGrid({ products, unavailableProducts = [] }: ProductGridProps) {
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [selectedStorages, setSelectedStorages] = useState<Set<string>>(new Set());
  const [selectedScreenSizes, setSelectedScreenSizes] = useState<Set<string>>(new Set());
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortOption>("best-deal");
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const chips = useMemo(() => {
    const set = new Set(products.map((p) => p.chip).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const memories = useMemo(() => {
    const set = new Set(
      products.map((p) => normalizeSpecValue(p.memory)).filter(Boolean)
    );
    return sortSpecValues(Array.from(set));
  }, [products]);

  const storages = useMemo(() => {
    const set = new Set(
      products.map((p) => normalizeSpecValue(p.storage)).filter(Boolean)
    );
    return sortSpecValues(Array.from(set));
  }, [products]);

  const screenSizes = useMemo(() => {
    const set = new Set(
      products
        .map((p) => normalizeScreenSize(p.screenSize))
        .filter(Boolean)
    );
    return Array.from(set)
      .sort((a, b) => Number(a) - Number(b))
      .map((s) => SCREEN_LABELS[s] ?? s);
  }, [products]);

  const sources = useMemo(() => {
    const set = new Set(products.map((p) => p.source));
    return Array.from(set).map((s) => SOURCE_LABELS[s] ?? s);
  }, [products]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (value: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const clear = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => () => {
    setter(new Set());
  };

  const clearAll = () => {
    setSelectedChips(new Set());
    setSelectedMemories(new Set());
    setSelectedStorages(new Set());
    setSelectedScreenSizes(new Set());
    setSelectedSources(new Set());
  };

  const hasActiveFilters =
    selectedChips.size > 0 ||
    selectedMemories.size > 0 ||
    selectedStorages.size > 0 ||
    selectedScreenSizes.size > 0 ||
    selectedSources.size > 0;

  const filtered = useMemo(() => {
    let result = products;

    if (selectedSources.size > 0) {
      // Reverse-map labels to source keys
      const reverseLabelMap = Object.fromEntries(
        Object.entries(SOURCE_LABELS).map(([k, v]) => [v, k])
      );
      const sourceKeys = new Set(
        Array.from(selectedSources).map((s) => reverseLabelMap[s] ?? s)
      );
      result = result.filter((p) => sourceKeys.has(p.source));
    }

    if (selectedChips.size > 0) {
      result = result.filter((p) => selectedChips.has(p.chip));
    }

    if (selectedMemories.size > 0) {
      result = result.filter((p) =>
        selectedMemories.has(normalizeSpecValue(p.memory))
      );
    }

    if (selectedStorages.size > 0) {
      result = result.filter((p) =>
        selectedStorages.has(normalizeSpecValue(p.storage))
      );
    }

    if (selectedScreenSizes.size > 0) {
      const rawSizes = new Set(
        Array.from(selectedScreenSizes).map((s) => s.replace('"', "").replace('"', ""))
      );
      result = result.filter((p) =>
        rawSizes.has(normalizeScreenSize(p.screenSize))
      );
    }

    switch (sort) {
      case "best-deal":
        result = [...result].sort((a, b) => computeDealScore(b) - computeDealScore(a));
        break;
      case "discount":
        result = [...result].sort((a, b) => b.savingsPercent - a.savingsPercent);
        break;
      case "price-asc":
        result = [...result].sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case "price-desc":
        result = [...result].sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case "newest":
        result = [...result].sort(
          (a, b) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime()
        );
        break;
    }

    return result;
  }, [products, selectedChips, selectedMemories, selectedStorages, selectedScreenSizes, selectedSources, sort]);

  const bestDealKey = useMemo(() => {
    if (filtered.length === 0) return null;
    return productKey(
      filtered.reduce((best, product) =>
        computeDealScore(product) > computeDealScore(best) ? product : best
      )
    );
  }, [filtered]);

  const topDiscountKey = useMemo(() => {
    if (filtered.length === 0) return null;
    return productKey(
      filtered.reduce((best, product) =>
        product.savingsPercent > best.savingsPercent ? product : best
      )
    );
  }, [filtered]);

  const globalBestDeal = useMemo(() => {
    if (products.length === 0) return null;
    return products.reduce((best, p) =>
      computeDealScore(p) > computeDealScore(best) ? p : best
    );
  }, [products]);

  const globalTopDiscount = useMemo(() => {
    if (products.length === 0) return null;
    return products.reduce((best, p) =>
      p.savingsPercent > best.savingsPercent ? p : best
    );
  }, [products]);

  const activeFilterTags = useMemo(() => {
    const tags: { label: string; onRemove: () => void }[] = [];
    selectedSources.forEach((source) => {
      tags.push({
        label: source,
        onRemove: () => toggle(setSelectedSources)(source),
      });
    });
    selectedChips.forEach((chip) => {
      tags.push({
        label: chip,
        onRemove: () => toggle(setSelectedChips)(chip),
      });
    });
    selectedMemories.forEach((mem) => {
      tags.push({
        label: mem,
        onRemove: () => toggle(setSelectedMemories)(mem),
      });
    });
    selectedStorages.forEach((stor) => {
      tags.push({
        label: stor,
        onRemove: () => toggle(setSelectedStorages)(stor),
      });
    });
    selectedScreenSizes.forEach((size) => {
      tags.push({
        label: size,
        onRemove: () => toggle(setSelectedScreenSizes)(size),
      });
    });
    return tags;
  }, [selectedChips, selectedMemories, selectedStorages, selectedScreenSizes, selectedSources]);

  return (
    <>
      {/* Hero Deal carousel - only shown when no filters are active */}
      {!hasActiveFilters && globalBestDeal && globalTopDiscount && (
        <div className="mb-6">
          <HeroDeal bestDeal={globalBestDeal} topDiscount={globalTopDiscount} />
        </div>
      )}

      <FilterBar
        chips={chips}
        selectedChips={selectedChips}
        onToggleChip={toggle(setSelectedChips)}
        onClearChips={clear(setSelectedChips)}
        memories={memories}
        selectedMemories={selectedMemories}
        onToggleMemory={toggle(setSelectedMemories)}
        onClearMemories={clear(setSelectedMemories)}
        storages={storages}
        selectedStorages={selectedStorages}
        onToggleStorage={toggle(setSelectedStorages)}
        onClearStorages={clear(setSelectedStorages)}
        screenSizes={screenSizes}
        selectedScreenSizes={selectedScreenSizes}
        onToggleScreenSize={toggle(setSelectedScreenSizes)}
        onClearScreenSizes={clear(setSelectedScreenSizes)}
        sources={sources}
        selectedSources={selectedSources}
        onToggleSource={toggle(setSelectedSources)}
        onClearSources={clear(setSelectedSources)}
        sort={sort}
        onSort={setSort}
        onClearAll={clearAll}
        resultCount={filtered.length}
        hasActiveFilters={hasActiveFilters}
        activeFilterTags={activeFilterTags}
      />

      <StatsStrip products={products} />

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-base text-[var(--text-secondary)] mb-3">
            Aucun MacBook Pro ne correspond a vos filtres
          </p>
          <button
            onClick={clearAll}
            className="text-sm text-[var(--accent-blue)] hover:underline"
          >
            Reinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((product) => (
            <ProductCard
              key={productKey(product)}
              product={product}
              isBestDeal={productKey(product) === bestDealKey}
              isTopDiscount={productKey(product) === topDiscountKey}
              onShowHistory={setHistoryProduct}
            />
          ))}
        </div>
      )}

      {/* Expired products section */}
      {unavailableProducts.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2.5 mb-5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-tertiary)]">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <h2 className="text-base font-semibold text-[var(--text-secondary)]">
              Deals expires
            </h2>
            <span className="text-xs text-[var(--text-tertiary)]">
              ({unavailableProducts.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {unavailableProducts.map((product) => (
              <ProductCard
                key={productKey(product)}
                product={product}
                isExpired
                onShowHistory={setHistoryProduct}
              />
            ))}
          </div>
        </div>
      )}

      {/* Price history panel */}
      {historyProduct && (
        <PriceHistoryPanel
          product={historyProduct}
          isOpen={!!historyProduct}
          onClose={() => setHistoryProduct(null)}
        />
      )}
    </>
  );
}
