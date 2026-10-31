"use client";

import {
  FACET_LABELS,
  type FacetKey,
  type FacetOption,
} from "@/lib/catalog-filters";

interface FilterSidebarProps {
  groups: Array<{ key: FacetKey; options: FacetOption[] }>;
  selected: Record<FacetKey, string[]>;
  onToggle: (key: FacetKey, value: string) => void;
  favoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  includeExpired: boolean;
  onToggleIncludeExpired: () => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

function getOptionMeta(option: FacetOption) {
  if (option.available > 0) {
    return `${option.available}`;
  }

  return option.total > 0 ? `expiré · ${option.total}` : "0";
}

export function FilterSidebar({
  groups,
  selected,
  onToggle,
  favoritesOnly,
  onToggleFavoritesOnly,
  includeExpired,
  onToggleIncludeExpired,
  hasActiveFilters,
  onClearAll,
}: FilterSidebarProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Filtres</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm text-[var(--accent-blue)] hover:underline"
          >
            Tout effacer
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1 rounded-2xl bg-[var(--surface)] p-1.5">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm">
          <span>Inclure les offres expirées</span>
          <input
            type="checkbox"
            checked={includeExpired}
            onChange={onToggleIncludeExpired}
            className="h-4 w-4 accent-[var(--accent-blue)]"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm">
          <span>Favoris uniquement</span>
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={onToggleFavoritesOnly}
            className="h-4 w-4 accent-[var(--accent-blue)]"
          />
        </label>
      </div>

      {groups.map((group) => (
        <fieldset key={group.key} className="flex flex-col gap-0.5">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            {FACET_LABELS[group.key]}
          </legend>
          {group.options.map((option) => {
            const isChecked = selected[group.key].includes(option.value);
            const isDim = option.available === 0 && !isChecked;

            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm transition-colors hover:bg-[var(--surface)] ${
                  isDim ? "text-[var(--text-tertiary)]" : "text-[var(--fg)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(group.key, option.value)}
                  className="h-4 w-4 shrink-0 accent-[var(--accent-blue)]"
                />
                <span className="flex-1 truncate">{option.label}</span>
                <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                  {getOptionMeta(option)}
                </span>
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
