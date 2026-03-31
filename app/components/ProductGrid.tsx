"use client";

import { useMemo, useState } from "react";
import {
  formatScreenSize,
  getProductLineLabel,
  normalizeScreenSize,
} from "@/lib/product-catalog";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { FilterBar, type SortOption } from "./FilterBar";
import { PriceHistoryPanel } from "./PriceHistoryPanel";
import { HeroDeal, type HeroPick } from "./HeroDeal";
import { StatsStrip } from "./StatsStrip";
import { getDealInsights } from "@/lib/deal-score";

interface ProductGridProps {
  products: Product[];
  unavailableProducts?: Product[];
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

export function ProductGrid({ products, unavailableProducts = [] }: ProductGridProps) {
  const [selectedProductLines, setSelectedProductLines] = useState<Set<string>>(new Set());
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [selectedStorages, setSelectedStorages] = useState<Set<string>>(new Set());
  const [selectedScreenSizes, setSelectedScreenSizes] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortOption>("best-deal");
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const productLines = useMemo(() => {
    const allOptions = ["Air", "Pro"];
    const available = new Set(products.map((p) => getProductLineLabel(p.productLine)));
    return allOptions.filter((option) => available.has(option));
  }, [products]);

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
      .map((s) => formatScreenSize(s) ?? s);
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
    setSelectedProductLines(new Set());
    setSelectedChips(new Set());
    setSelectedMemories(new Set());
    setSelectedStorages(new Set());
    setSelectedScreenSizes(new Set());
  };

  const hasActiveFilters =
    selectedProductLines.size > 0 ||
    selectedChips.size > 0 ||
    selectedMemories.size > 0 ||
    selectedStorages.size > 0 ||
    selectedScreenSizes.size > 0;

  const dealInsightsByPartNumber = useMemo(() => {
    const grouped = {
      air: products.filter((product) => product.productLine === "air"),
      pro: products.filter((product) => product.productLine === "pro"),
    };

    return new Map(
      products.map((product) => [
        product.partNumber,
        getDealInsights(product, grouped[product.productLine]),
      ])
    );
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;

    if (selectedProductLines.size > 0) {
      result = result.filter((p) =>
        selectedProductLines.has(getProductLineLabel(p.productLine))
      );
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
        Array.from(selectedScreenSizes).map((s) => s.replace(/"/g, ""))
      );
      result = result.filter((p) =>
        rawSizes.has(normalizeScreenSize(p.screenSize))
      );
    }

    switch (sort) {
      case "best-deal":
        result = [...result].sort(
          (a, b) =>
            (dealInsightsByPartNumber.get(b.partNumber)?.totalScore ?? 0) -
            (dealInsightsByPartNumber.get(a.partNumber)?.totalScore ?? 0)
        );
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
  }, [
    products,
    selectedProductLines,
    selectedChips,
    selectedMemories,
    selectedStorages,
    selectedScreenSizes,
    sort,
    dealInsightsByPartNumber,
  ]);

  const topDiscountPartNumber = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.reduce((best, product) =>
      product.savingsPercent > best.savingsPercent ? product : best
    ).partNumber;
  }, [filtered]);

  const topPartNumberByLine = useMemo(() => {
    const byLine = new Map<"air" | "pro", string>();

    (["air", "pro"] as const).forEach((productLine) => {
      const lineProducts = filtered.filter((product) => product.productLine === productLine);

      if (lineProducts.length === 0) {
        return;
      }

      const topProduct = lineProducts.reduce((best, product) =>
        (dealInsightsByPartNumber.get(product.partNumber)?.totalScore ?? 0) >
        (dealInsightsByPartNumber.get(best.partNumber)?.totalScore ?? 0)
          ? product
          : best
      );

      byLine.set(productLine, topProduct.partNumber);
    });

    return byLine;
  }, [filtered, dealInsightsByPartNumber]);

  const heroPicks = useMemo<HeroPick[]>(() => {
    return (["air", "pro"] as const)
      .flatMap((productLine) => {
        const lineProducts = products.filter((product) => product.productLine === productLine);

        if (lineProducts.length === 0) {
          return [];
        }

        const topProduct = lineProducts.reduce((best, product) =>
          (dealInsightsByPartNumber.get(product.partNumber)?.totalScore ?? 0) >
          (dealInsightsByPartNumber.get(best.partNumber)?.totalScore ?? 0)
            ? product
            : best
        );
        const insights = dealInsightsByPartNumber.get(topProduct.partNumber);

        return insights
          ? [{
              product: topProduct,
              score: insights.totalScore,
              reasons: insights.reasons,
              label: productLine === "air" ? "Top Air" : "Top Pro",
            }]
          : [];
      });
  }, [products, dealInsightsByPartNumber]);

  const activeFilterTags = useMemo(() => {
    const tags: { label: string; onRemove: () => void }[] = [];
    selectedProductLines.forEach((productLine) => {
      tags.push({
        label: productLine,
        onRemove: () => toggle(setSelectedProductLines)(productLine),
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
  }, [
    selectedProductLines,
    selectedChips,
    selectedMemories,
    selectedStorages,
    selectedScreenSizes,
  ]);

  return (
    <>
      {!hasActiveFilters && heroPicks.length > 0 && (
        <div className="mb-6">
          <HeroDeal picks={heroPicks} />
        </div>
      )}

      <FilterBar
        productLines={productLines}
        selectedProductLines={selectedProductLines}
        onToggleProductLine={toggle(setSelectedProductLines)}
        onClearProductLines={clear(setSelectedProductLines)}
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
            Aucun MacBook ne correspond a vos filtres
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
          {filtered.map((product) => {
            const insights = dealInsightsByPartNumber.get(product.partNumber);
            const topLabel =
              topPartNumberByLine.get(product.productLine) === product.partNumber
                ? product.productLine === "air"
                  ? "Top Air"
                  : "Top Pro"
                : undefined;

            return (
              <ProductCard
                key={product.partNumber}
                product={product}
                dealScore={insights?.totalScore}
                topLabel={topLabel}
                topReasons={topLabel ? insights?.reasons : undefined}
                isTopDiscount={product.partNumber === topDiscountPartNumber}
                onShowHistory={setHistoryProduct}
              />
            );
          })}
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
              Deals expirés
            </h2>
            <span className="text-xs text-[var(--text-tertiary)]">
              ({unavailableProducts.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {unavailableProducts.map((product) => (
              <ProductCard
                key={product.partNumber}
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
