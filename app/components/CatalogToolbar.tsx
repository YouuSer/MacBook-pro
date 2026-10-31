"use client";

import { SORT_OPTIONS, type SortOption } from "@/lib/catalog-filters";

interface CatalogToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  availableCount: number;
  expiredCount: number | null;
  tags: Array<{ key: string; label: string; onRemove: () => void }>;
  onOpenFilters: () => void;
}

export function CatalogToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  availableCount,
  expiredCount,
  tags,
  onOpenFilters,
}: CatalogToolbarProps) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-11 min-w-0 flex-1 basis-64 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 focus-within:border-[var(--accent-blue)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--text-tertiary)]" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Rechercher (ex. M4 Pro 24 Go)"
            aria-label="Rechercher une offre"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </label>
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm lg:hidden"
        >
          Filtres
          {tags.length > 0 && (
            <span className="rounded-full bg-[var(--accent-blue)] px-1.5 text-xs text-white">
              {tags.length}
            </span>
          )}
        </button>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span className="hidden sm:inline">Trier par</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
            aria-label="Trier par"
            className="h-11 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--fg)] focus:border-[var(--accent-blue)] focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--fg)]">{availableCount}</span> disponible
          {availableCount > 1 ? "s" : ""}
          {expiredCount !== null && ` · ${expiredCount} expirée${expiredCount > 1 ? "s" : ""}`}
        </span>
        {tags.map((tag) => (
          <button
            key={tag.key}
            type="button"
            onClick={tag.onRemove}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-blue)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent-blue)]"
            aria-label={`Retirer ${tag.label}`}
          >
            {tag.label} <span aria-hidden>×</span>
          </button>
        ))}
      </div>
    </div>
  );
}
