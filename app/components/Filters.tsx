"use client";

export type SortOption = "discount" | "price-asc" | "price-desc" | "newest";

interface FiltersProps {
  chips: string[];
  selectedChips: Set<string>;
  onToggleChip: (chip: string) => void;
  screenSize: string;
  onScreenSize: (size: string) => void;
  sort: SortOption;
  onSort: (sort: SortOption) => void;
}

export function Filters({
  chips,
  selectedChips,
  onToggleChip,
  screenSize,
  onScreenSize,
  sort,
  onSort,
}: FiltersProps) {
  return (
    <div className="mb-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 md:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex flex-wrap items-center gap-2.5 lg:flex-1">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-subtle)]">
            Puce
          </span>
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => onToggleChip(chip)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] ${
                selectedChips.has(chip)
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--foreground)] hover:border-[var(--accent)]/60"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-subtle)]">
            Ecran
          </span>
          {[
            { value: "", label: "Tous" },
            { value: "14", label: '14"' },
            { value: "16", label: '16"' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onScreenSize(opt.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] ${
                screenSize === opt.value
                  ? "border-sky-500 bg-sky-500 text-white"
                  : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--foreground)] hover:border-sky-500/70"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 lg:ml-auto">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-subtle)]">
            Tri
          </span>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortOption)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--foreground)] transition-colors focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="discount">Meilleur discount</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="newest">Plus recents</option>
          </select>
        </div>
      </div>
    </div>
  );
}
