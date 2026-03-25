"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { Filters, type SortOption } from "./Filters";

interface ProductGridProps {
  products: Product[];
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
      result = result.filter((p) => p.screenSize === screenSize);
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
            <ProductCard key={product.partNumber} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
