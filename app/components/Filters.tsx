"use client";

export type SortOption = "discount" | "price-asc" | "price-desc" | "newest";

interface FiltersProps {
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
  screenSize: string;
  onScreenSize: (size: string) => void;
  sort: SortOption;
  onSort: (sort: SortOption) => void;
}

export function Filters({
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
  screenSize,
  onScreenSize,
  sort,
  onSort,
}: FiltersProps) {
  const filterButtonClass = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] ${
      active
        ? "border-sky-500 bg-sky-500 text-white"
        : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--foreground)] hover:border-sky-500/70"
    }`;

  return (
    <div className="mb-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-subtle)]">
          Puce
        </span>
        <button
          onClick={onClearChips}
          className={filterButtonClass(selectedChips.size === 0)}
        >
          Tous
        </button>
        {chips.map((chip) => (
          <button
            key={chip}
            onClick={() => onToggleChip(chip)}
            className={filterButtonClass(selectedChips.has(chip))}
          >
            {chip}
          </button>
        ))}

        <span className="mx-1 h-5 w-px bg-[var(--border)]" />

        <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-subtle)]">
          RAM
        </span>
        <button
          onClick={onClearMemories}
          className={filterButtonClass(selectedMemories.size === 0)}
        >
          Tous
        </button>
        {memories.map((memory) => (
          <button
            key={memory}
            onClick={() => onToggleMemory(memory)}
            className={filterButtonClass(selectedMemories.has(memory))}
          >
            {memory}
          </button>
        ))}

        <span className="mx-1 h-5 w-px bg-[var(--border)]" />

        <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-subtle)]">
          Stockage
        </span>
        <button
          onClick={onClearStorages}
          className={filterButtonClass(selectedStorages.size === 0)}
        >
          Tous
        </button>
        {storages.map((storage) => (
          <button
            key={storage}
            onClick={() => onToggleStorage(storage)}
            className={filterButtonClass(selectedStorages.has(storage))}
          >
            {storage}
          </button>
        ))}

        <span className="mx-1 h-5 w-px bg-[var(--border)]" />

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
            className={filterButtonClass(screenSize === opt.value)}
          >
            {opt.label}
          </button>
        ))}

        <span className="mx-1 h-5 w-px bg-[var(--border)]" />

        <span className="ml-auto text-[11px] uppercase tracking-[0.08em] text-[var(--text-subtle)]">
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
  );
}
