"use client";

import { CATEGORY_DEFINITIONS, type Category } from "@/lib/product-catalog";

interface CategoryNavProps {
  active: Category;
  counts: Map<Category, number>;
  onSelect: (category: Category) => void;
}

export function CategoryNav({ active, counts, onSelect }: CategoryNavProps) {
  return (
    <nav
      aria-label="Catégories"
      className="sticky top-14 z-40 -mx-4 mb-6 flex gap-1.5 overflow-x-auto border-b border-[var(--border)]/50 bg-[var(--bg)]/85 px-4 py-3 backdrop-blur-xl"
    >
      {CATEGORY_DEFINITIONS.map((definition) => {
        const isActive = active === definition.id;

        return (
          <button
            key={definition.id}
            type="button"
            onClick={() => onSelect(definition.id)}
            aria-pressed={isActive}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--fg)] text-[var(--bg)]"
                : "text-[var(--fg)] hover:bg-[var(--surface)]"
            }`}
          >
            {definition.label}
            <span
              className={`text-xs tabular-nums ${isActive ? "opacity-70" : "text-[var(--text-secondary)]"}`}
            >
              {counts.get(definition.id) ?? 0}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
