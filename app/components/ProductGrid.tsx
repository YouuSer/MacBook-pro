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

const PRICE_MOVEMENT_OPTIONS = ["En baisse", "En hausse"];

function getPriceMovementLabel(priceTrend: Product["priceTrend"]) {
  if (priceTrend === "down") {
    return "En baisse";
  }

  if (priceTrend === "up") {
    return "En hausse";
  }

  return null;
}

function getTopLineLabel(productLine: Product["productLine"]) {
  return productLine === "air" ? "Top Air" : "Top Pro";
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

function getSortableSpecValue(value: string): number {
  const parsed = toCapacityValue(normalizeSpecValue(value));
  return Number.isFinite(parsed) ? parsed : -1;
}

export function ProductGrid({ products, unavailableProducts = [] }: ProductGridProps) {
  const [selectedProductLines, setSelectedProductLines] = useState<Set<string>>(new Set());
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [selectedStorages, setSelectedStorages] = useState<Set<string>>(new Set());
  const [selectedScreenSizes, setSelectedScreenSizes] = useState<Set<string>>(new Set());
  const [selectedPriceMovements, setSelectedPriceMovements] = useState<Set<string>>(new Set());
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
    setSelectedPriceMovements(new Set());
  };

  const hasActiveFilters =
    selectedProductLines.size > 0 ||
    selectedChips.size > 0 ||
    selectedMemories.size > 0 ||
    selectedStorages.size > 0 ||
    selectedScreenSizes.size > 0 ||
    selectedPriceMovements.size > 0;

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

  const matchesFilters = (product: Product) => {
    if (
      selectedProductLines.size > 0 &&
      !selectedProductLines.has(getProductLineLabel(product.productLine))
    ) {
      return false;
    }

    if (selectedChips.size > 0 && !selectedChips.has(product.chip)) {
      return false;
    }

    if (
      selectedMemories.size > 0 &&
      !selectedMemories.has(normalizeSpecValue(product.memory))
    ) {
      return false;
    }

    if (
      selectedStorages.size > 0 &&
      !selectedStorages.has(normalizeSpecValue(product.storage))
    ) {
      return false;
    }

    if (selectedScreenSizes.size > 0) {
      const rawSizes = new Set(
        Array.from(selectedScreenSizes).map((size) => size.replace(/"/g, ""))
      );

      if (!rawSizes.has(normalizeScreenSize(product.screenSize))) {
        return false;
      }
    }

    if (selectedPriceMovements.size > 0) {
      const movementLabel = getPriceMovementLabel(product.priceTrend);

      if (!movementLabel || !selectedPriceMovements.has(movementLabel)) {
        return false;
      }
    }

    return true;
  };

  const sortProducts = (productList: Product[]) => {
    const result = [...productList];

    switch (sort) {
      case "best-deal":
        return result.sort(
          (a, b) =>
            (dealInsightsByPartNumber.get(b.partNumber)?.totalScore ?? 0) -
            (dealInsightsByPartNumber.get(a.partNumber)?.totalScore ?? 0)
        );
      case "discount":
        return result.sort((a, b) => b.savingsPercent - a.savingsPercent);
      case "price-asc":
        return result.sort((a, b) => a.currentPrice - b.currentPrice);
      case "price-desc":
        return result.sort((a, b) => b.currentPrice - a.currentPrice);
      case "ram-desc":
        return result.sort(
          (a, b) =>
            getSortableSpecValue(b.memory) - getSortableSpecValue(a.memory)
        );
      case "storage-desc":
        return result.sort(
          (a, b) =>
            getSortableSpecValue(b.storage) - getSortableSpecValue(a.storage)
        );
      case "appearances-desc":
        return result.sort(
          (a, b) =>
            b.appearanceCount - a.appearanceCount ||
            new Date(b.appearanceLastSeen).getTime() -
              new Date(a.appearanceLastSeen).getTime()
        );
      case "newest":
        return result.sort(
          (a, b) =>
            new Date(b.appearanceFirstSeen).getTime() -
            new Date(a.appearanceFirstSeen).getTime()
        );
    }
  };

  const filtered = useMemo(() => {
    return sortProducts(products.filter(matchesFilters));
  }, [
    products,
    selectedProductLines,
    selectedChips,
    selectedMemories,
    selectedStorages,
    selectedScreenSizes,
    selectedPriceMovements,
    sort,
    dealInsightsByPartNumber,
  ]);

  const filteredUnavailableProducts = useMemo(
    () => sortProducts(unavailableProducts.filter(matchesFilters)),
    [
      unavailableProducts,
      selectedProductLines,
      selectedChips,
      selectedMemories,
      selectedStorages,
      selectedScreenSizes,
      selectedPriceMovements,
      sort,
      dealInsightsByPartNumber,
    ]
  );

  const topDiscountPartNumber = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.reduce((best, product) =>
      product.savingsPercent > best.savingsPercent ? product : best
    ).partNumber;
  }, [filtered]);

  const topDealPartNumber = useMemo(() => {
    if (filtered.length === 0) return null;

    return filtered.reduce((best, product) =>
      (dealInsightsByPartNumber.get(product.partNumber)?.totalScore ?? 0) >
      (dealInsightsByPartNumber.get(best.partNumber)?.totalScore ?? 0)
        ? product
        : best
    ).partNumber;
  }, [filtered, dealInsightsByPartNumber]);

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
              label: getTopLineLabel(productLine),
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
    selectedPriceMovements.forEach((movement) => {
      tags.push({
        label: movement,
        onRemove: () => toggle(setSelectedPriceMovements)(movement),
      });
    });
    return tags;
  }, [
    selectedProductLines,
    selectedChips,
    selectedMemories,
    selectedStorages,
    selectedScreenSizes,
    selectedPriceMovements,
  ]);

  const visibleCount = filtered.length + filteredUnavailableProducts.length;

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
        priceMovements={PRICE_MOVEMENT_OPTIONS}
        selectedPriceMovements={selectedPriceMovements}
        onTogglePriceMovement={toggle(setSelectedPriceMovements)}
        onClearPriceMovements={clear(setSelectedPriceMovements)}
        sort={sort}
        onSort={setSort}
        onClearAll={clearAll}
        resultCount={visibleCount}
        hasActiveFilters={hasActiveFilters}
        activeFilterTags={activeFilterTags}
      />

      <StatsStrip products={products} />

      {visibleCount === 0 ? (
        <div className="text-center py-20">
          <p className="text-base text-[var(--text-secondary)] mb-3">
            Aucun MacBook ne correspond à vos filtres
          </p>
          <button
            onClick={clearAll}
            className="text-sm text-[var(--accent-blue)] hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((product) => {
            const insights = dealInsightsByPartNumber.get(product.partNumber);
            const topLabel =
              topPartNumberByLine.get(product.productLine) === product.partNumber
                ? getTopLineLabel(product.productLine)
                : undefined;
            const isTopDeal = product.partNumber === topDealPartNumber;
            const topReasons = topLabel || isTopDeal ? insights?.reasons : undefined;

            return (
              <ProductCard
                key={product.partNumber}
                product={product}
                dealScore={insights?.totalScore}
                topLabel={topLabel}
                topReasons={topReasons}
                isTopDeal={isTopDeal}
                isTopDiscount={product.partNumber === topDiscountPartNumber}
                onShowHistory={setHistoryProduct}
              />
            );
          })}
        </div>
      )}

      {/* Expired products section */}
      {filteredUnavailableProducts.length > 0 && (
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
              ({filteredUnavailableProducts.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUnavailableProducts.map((product) => (
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
