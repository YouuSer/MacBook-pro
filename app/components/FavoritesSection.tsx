"use client";

import { getFavoriteStateLabel } from "@/lib/favorites";
import type { FavoriteConfig } from "@/lib/types";
import { Badge } from "./Badge";

interface FavoritesSectionProps {
  favorites: FavoriteConfig[];
  canManage: boolean;
  busyKey: string | null;
  onOpen: (favoriteId: number) => void;
  onRemove: (favoriteId: number) => void;
}

function formatFavoriteMetaDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FavoritesSection({
  favorites,
  canManage,
  busyKey,
  onOpen,
  onRemove,
}: FavoritesSectionProps) {
  if (favorites.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--fg)]">Favoris</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Suivi multi-apparitions et historique agrégé par configuration.
          </p>
        </div>
        <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
          {favorites.length} favori{favorites.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {favorites.map((favorite) => {
          const metaDate =
            formatFavoriteMetaDate(
              favorite.currentState === "available"
                ? favorite.lastMatchedAt
                : favorite.lastEventAt
            ) ?? "—";
          const isBusy = busyKey === `favorite-${favorite.id}`;

          return (
            <div
              key={favorite.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(favorite.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(favorite.id);
                }
              }}
              className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-md)]"
            >
              <div className="absolute right-4 top-4 flex items-center gap-2">
                <Badge variant="favorite">Favori</Badge>
                {canManage && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(favorite.id);
                    }}
                    disabled={isBusy}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-amber-500 transition-colors hover:border-[var(--border-hover)] hover:text-amber-600 disabled:cursor-wait disabled:opacity-60"
                    aria-label="Retirer des favoris"
                  >
                    {isBusy ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-start gap-4">
                {favorite.imageUrl && (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--image-bg)]">
                    <img
                      src={favorite.imageUrl}
                      alt={favorite.label}
                      className="h-16 object-contain"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        favorite.currentState === "available"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-neutral-500/10 text-[var(--text-secondary)]"
                      }`}
                    >
                      {getFavoriteStateLabel(favorite.currentState)}
                    </span>
                    <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                      {favorite.currentMatchCount} SKU actif
                      {favorite.currentMatchCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-[var(--fg)]">
                    {favorite.label}
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {favorite.currentState === "available"
                          ? "Meilleur prix actuel"
                          : "Dernier événement"}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--fg)]">
                        {favorite.bestCurrentPrice === null
                          ? "—"
                          : `${favorite.bestCurrentPrice.toLocaleString("fr-FR")} €`}
                      </p>
                    </div>
                    <p className="text-right text-xs text-[var(--text-tertiary)]">
                      {metaDate}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
