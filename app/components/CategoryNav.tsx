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
      className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1"
    >
      {CATEGORY_DEFINITIONS.map((definition) => {
        const isActive = active === definition.id;

        return (
          <button
            key={definition.id}
            type="button"
            onClick={() => onSelect(definition.id)}
            aria-pressed={isActive}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
              isActive
                ? "bg-[var(--fg)] text-[var(--bg)]"
                : "text-[var(--fg)] hover:bg-[var(--surface-secondary)]"
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
