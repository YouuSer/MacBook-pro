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
    <div className="flex flex-wrap items-center gap-4 mb-6">
      {/* Chip filters */}
      <div className="flex gap-2 flex-wrap">
        {chips.map((chip) => (
          <button
            key={chip}
            onClick={() => onToggleChip(chip)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              selectedChips.has(chip)
                ? "bg-purple-500/20 text-purple-400 border-purple-500/50"
                : "bg-[var(--card)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--muted)]"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-[var(--border)] hidden md:block" />

      {/* Screen size */}
      <div className="flex gap-1">
        {[
          { value: "", label: "Tous" },
          { value: "14", label: '14"' },
          { value: "16", label: '16"' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => onScreenSize(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              screenSize === opt.value
                ? "bg-white/10 text-white"
                : "text-[var(--muted)] hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-[var(--border)] hidden md:block" />

      {/* Sort */}
      <select
        value={sort}
        onChange={(e) => onSort(e.target.value as SortOption)}
        className="bg-[var(--card)] border border-[var(--border)] text-sm rounded-lg px-3 py-1.5 text-[var(--foreground)] focus:outline-none focus:border-[var(--muted)]"
      >
        <option value="discount">Meilleur discount</option>
        <option value="price-asc">Prix croissant</option>
        <option value="price-desc">Prix décroissant</option>
        <option value="newest">Plus récents</option>
      </select>
    </div>
  );
}
