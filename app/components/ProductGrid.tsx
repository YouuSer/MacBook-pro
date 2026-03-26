"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard, type SpecDiffFlags } from "./ProductCard";
import { Filters, type SortOption } from "./Filters";

interface ProductGridProps {
  products: Product[];
}

const SCREEN_LABELS: Record<string, string> = {
  "14": '14"',
  "16": '16"',
};

const DEFAULT_DIFF_FLAGS: SpecDiffFlags = {
  chip: false,
  memory: false,
  storage: false,
  screen: false,
};

function addCount(map: Map<string, number>, value: string) {
  map.set(value, (map.get(value) ?? 0) + 1);
}

function getTopCount(map: Map<string, number>): number {
  let topCount = 0;
  for (const count of map.values()) {
    if (count > topCount) topCount = count;
  }
  return topCount;
}

function normalizeScreenSize(value: string): string {
  const match = value.trim().match(/\d+/);
  return match ? match[0] : "";
}

function getSpecValue(product: Product, key: keyof SpecDiffFlags): string {
  switch (key) {
    case "chip": {
      const chip = product.chip.trim();
      return chip || "Inconnu";
    }
    case "memory": {
      const memory = product.memory.trim();
      return memory ? memory.toUpperCase() : "—";
    }
    case "storage": {
      const storage = product.storage.trim();
      return storage ? storage.toUpperCase() : "—";
    }
    case "screen": {
      const screen = normalizeScreenSize(product.screenSize);
      if (!screen) return "—";
      return SCREEN_LABELS[screen] ?? screen;
    }
  }
}

export function ProductGrid({ products }: ProductGridProps) {
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());
  const [screenSize, setScreenSize] = useState("");
  const [sort, setSort] = useState<SortOption>("discount");

  // Extract unique chips
  const chips = useMemo(() => {
    const set = new Set(products.map((p) => p.chip));
    return Array.from(set).sort();
  }, [products]);

  const toggleChip = (chip: string) => {
    setSelectedChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = products;

    if (selectedChips.size > 0) {
      result = result.filter((p) => selectedChips.has(p.chip));
    }

    if (screenSize) {
      result = result.filter(
        (p) => normalizeScreenSize(p.screenSize) === screenSize
      );
    }

    switch (sort) {
      case "discount":
        result = [...result].sort(
          (a, b) => b.savingsPercent - a.savingsPercent
        );
        break;
      case "price-asc":
        result = [...result].sort(
          (a, b) => a.currentPrice - b.currentPrice
        );
        break;
      case "price-desc":
        result = [...result].sort(
          (a, b) => b.currentPrice - a.currentPrice
        );
        break;
      case "newest":
        result = [...result].sort(
          (a, b) =>
            new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime()
        );
        break;
    }

    return result;
  }, [products, selectedChips, screenSize, sort]);

  const specDiffByPartNumber = useMemo(() => {
    const chipCounts = new Map<string, number>();
    const memoryCounts = new Map<string, number>();
    const storageCounts = new Map<string, number>();
    const screenCounts = new Map<string, number>();

    for (const product of filtered) {
      addCount(chipCounts, getSpecValue(product, "chip"));
      addCount(memoryCounts, getSpecValue(product, "memory"));
      addCount(storageCounts, getSpecValue(product, "storage"));
      addCount(screenCounts, getSpecValue(product, "screen"));
    }

    const total = filtered.length;
    const topCounts = {
      chip: getTopCount(chipCounts),
      memory: getTopCount(memoryCounts),
      storage: getTopCount(storageCounts),
      screen: getTopCount(screenCounts),
    };
    const hasMajority = {
      chip: chipCounts.size > 1 && topCounts.chip > total / 2,
      memory: memoryCounts.size > 1 && topCounts.memory > total / 2,
      storage: storageCounts.size > 1 && topCounts.storage > total / 2,
      screen: screenCounts.size > 1 && topCounts.screen > total / 2,
    };

    const diffByPartNumber = new Map<string, SpecDiffFlags>();
    for (const product of filtered) {
      const chipValue = getSpecValue(product, "chip");
      const memoryValue = getSpecValue(product, "memory");
      const storageValue = getSpecValue(product, "storage");
      const screenValue = getSpecValue(product, "screen");

      diffByPartNumber.set(product.partNumber, {
        chip:
          hasMajority.chip &&
          (chipCounts.get(chipValue) ?? 0) < topCounts.chip,
        memory:
          hasMajority.memory &&
          (memoryCounts.get(memoryValue) ?? 0) < topCounts.memory,
        storage:
          hasMajority.storage &&
          (storageCounts.get(storageValue) ?? 0) < topCounts.storage,
        screen:
          hasMajority.screen &&
          (screenCounts.get(screenValue) ?? 0) < topCounts.screen,
      });
    }

    return diffByPartNumber;
  }, [filtered]);

  const bestDealPartNumber = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.reduce((best, product) =>
      product.savingsPercent > best.savingsPercent ? product : best
    ).partNumber;
  }, [filtered]);

  return (
    <>
      <Filters
        chips={chips}
        selectedChips={selectedChips}
        onToggleChip={toggleChip}
        screenSize={screenSize}
        onScreenSize={setScreenSize}
        sort={sort}
        onSort={setSort}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[var(--muted)]">
          <p className="text-lg mb-2">Aucun MacBook Pro disponible</p>
          <p className="text-sm">
            Modifiez vos filtres ou revenez plus tard
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <ProductCard
              key={product.partNumber}
              product={product}
              specDiffFlags={
                specDiffByPartNumber.get(product.partNumber) ??
                DEFAULT_DIFF_FLAGS
              }
              isBestDeal={product.partNumber === bestDealPartNumber}
            />
          ))}
        </div>
      )}
    </>
  );
}
