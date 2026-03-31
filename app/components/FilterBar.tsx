"use client";

import { FilterDropdown } from "./FilterDropdown";

export type SortOption = "best-deal" | "discount" | "price-asc" | "price-desc" | "newest";

interface FilterBarProps {
  productLines: string[];
  selectedProductLines: Set<string>;
  onToggleProductLine: (productLine: string) => void;
  onClearProductLines: () => void;
  chips: string[];
  selectedChips: Set<string>;
  onToggleChip: (chip: string) => void;
  onClearChips: () => void;
  memories: string[];
  selectedMemories: Set<string>;
  onToggleMemory: (memory: string) => void;
  onClearMemories: () => void;
  storages: string[];
  selectedStorages: Set<string>;
  onToggleStorage: (storage: string) => void;
  onClearStorages: () => void;
  screenSizes: string[];
  selectedScreenSizes: Set<string>;
  onToggleScreenSize: (size: string) => void;
  onClearScreenSizes: () => void;
  sort: SortOption;
  onSort: (sort: SortOption) => void;
  onClearAll: () => void;
  resultCount: number;
  hasActiveFilters: boolean;
  activeFilterTags: { label: string; onRemove: () => void }[];
}

export function FilterBar({
  productLines,
  selectedProductLines,
  onToggleProductLine,
  onClearProductLines,
  chips,
  selectedChips,
  onToggleChip,
  onClearChips,
  memories,
  selectedMemories,
  onToggleMemory,
  onClearMemories,
  storages,
  selectedStorages,
  onToggleStorage,
  onClearStorages,
  screenSizes,
  selectedScreenSizes,
  onToggleScreenSize,
  onClearScreenSizes,
  sort,
  onSort,
  onClearAll,
  resultCount,
  hasActiveFilters,
  activeFilterTags,
}: FilterBarProps) {
  return (
    <div className="sticky top-14 z-40 -mx-4 px-4 py-3 backdrop-blur-xl bg-[var(--bg)]/80 border-b border-[var(--border)]/50">
      <div className="flex items-center gap-2 flex-wrap">
        <FilterDropdown
          label="Gamme"
          options={productLines}
          selected={selectedProductLines}
          onToggle={onToggleProductLine}
          onClear={onClearProductLines}
        />
        <FilterDropdown
          label="Puce"
          options={chips}
          selected={selectedChips}
          onToggle={onToggleChip}
          onClear={onClearChips}
        />
        <FilterDropdown
          label="RAM"
          options={memories}
          selected={selectedMemories}
          onToggle={onToggleMemory}
          onClear={onClearMemories}
        />
        <FilterDropdown
          label="Stockage"
          options={storages}
          selected={selectedStorages}
          onToggle={onToggleStorage}
          onClear={onClearStorages}
        />
        <FilterDropdown
          label="Ecran"
          options={screenSizes}
          selected={selectedScreenSizes}
          onToggle={onToggleScreenSize}
          onClear={onClearScreenSizes}
        />

        <div className="ml-auto flex items-center gap-3">
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortOption)}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--fg)] transition-colors focus:outline-none focus:border-[var(--accent-blue)] hover:border-[var(--border-hover)]"
          >
            <option value="best-deal">Top dev</option>
            <option value="discount">Top remise</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix decroissant</option>
            <option value="newest">Plus recents</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {activeFilterTags.map((tag) => (
            <span
              key={tag.label}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-secondary)] text-xs font-medium px-3 py-1.5 text-[var(--fg)]"
            >
              {tag.label}
              <button
                onClick={tag.onRemove}
                className="text-[var(--text-tertiary)] hover:text-[var(--fg)] transition-colors"
                aria-label={`Retirer ${tag.label}`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3L9 9M9 3L3 9" />
                </svg>
              </button>
            </span>
          ))}
          <button
            onClick={onClearAll}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors"
          >
            Tout effacer
          </button>
          <span className="ml-auto text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--fg)]">{resultCount}</span> MacBook
          </span>
        </div>
      )}
    </div>
  );
}
