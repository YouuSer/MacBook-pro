"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { getFavoriteEventLabel, getFavoriteStateLabel } from "@/lib/favorites";
import type { FavoriteDetail } from "@/lib/types";

interface FavoriteDetailContentProps {
  favoriteId: number;
  // Masqué quand le contenu est affiché sous la fiche d'un produit, qui a déjà son résumé.
  showSummary?: boolean;
}

function getCssVar(name: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FavoriteDetailContent({
  favoriteId,
  showSummary = true,
}: FavoriteDetailContentProps) {
  const [data, setData] = useState<FavoriteDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colors, setColors] = useState({
    axis: "#888",
    tooltipBg: "#fff",
    tooltipBorder: "#ddd",
    blue: "#0071e3",
  });

  useEffect(() => {
    const updateColors = () => {
      setColors({
        axis: getCssVar("--chart-axis") || "#888",
        tooltipBg: getCssVar("--tooltip-bg") || "#fff",
        tooltipBorder: getCssVar("--tooltip-border") || "#ddd",
        blue: getCssVar("--accent-blue") || "#0071e3",
      });
    };

    updateColors();

    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/favorites/${favoriteId}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as
          FavoriteDetail | { error?: string };

        if (!response.ok || !("favorite" in payload)) {
          throw new Error(
            "error" in payload ? payload.error : "Chargement impossible.",
          );
        }

        setData(payload);
        setLoading(false);
      })
      .catch((loadError) => {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Chargement impossible.";
        setError(message);
        setLoading(false);
      });
  }, [favoriteId]);

  const chartData =
    data?.priceHistory.map((entry) => ({
      date: new Date(entry.firstSeenAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      prix: entry.price,
    })) ?? [];

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent-blue)]" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : !data ? null : (
        <div className="space-y-6">
          {showSummary && (
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-secondary)]/50 p-4">
              <div className="flex items-start gap-4">
                {data.favorite.imageUrl ? (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--image-bg)]">
                    <img
                      src={data.favorite.imageUrl}
                      alt={data.favorite.label}
                      className="h-16 object-contain"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--fg)]">
                    {data.favorite.label}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="rounded-full bg-[var(--surface)] px-2.5 py-1">
                      {getFavoriteStateLabel(data.favorite.currentState)}
                    </span>
                    <span className="rounded-full bg-[var(--surface)] px-2.5 py-1">
                      {data.favorite.currentMatchCount} SKU actif
                      {data.favorite.currentMatchCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--fg)]">
                      {data.favorite.bestCurrentPrice === null
                        ? "—"
                        : `${data.favorite.bestCurrentPrice.toLocaleString("fr-FR")} €`}
                    </span>
                    {data.favorite.lastMatchedAt && (
                      <span className="ml-2">
                        vu le {formatDateTime(data.favorite.lastMatchedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                Disponibilités actuelles
              </h4>
              <span className="text-xs text-[var(--text-secondary)]">
                {data.currentMatches.length} résultat
                {data.currentMatches.length > 1 ? "s" : ""}
              </span>
            </div>
            {data.currentMatches.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Aucune machine disponible actuellement pour ce favori.
              </p>
            ) : (
              <div className="space-y-2">
                {data.currentMatches.map((product) => (
                  <a
                    key={product.partNumber}
                    href={product.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3 transition-colors hover:border-[var(--border-hover)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--fg)]">
                        {product.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {product.partNumber}
                      </p>
                    </div>
                    <span className="ml-3 shrink-0 text-sm font-semibold text-[var(--fg)]">
                      {product.currentPrice.toLocaleString("fr-FR")} €
                    </span>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold">
              Historique de prix agrégé
            </h4>
            {chartData.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Pas assez de données pour afficher un historique.
              </p>
            ) : (
              <div className="rounded-3xl border border-[var(--border)] p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="favoriteBlueGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={colors.blue}
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor={colors.blue}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: colors.axis }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.tooltipBg,
                        border: `1px solid ${colors.tooltipBorder}`,
                        borderRadius: "12px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value) => [
                        `${Number(value).toLocaleString("fr-FR")} €`,
                        "Prix",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="prix"
                      stroke={colors.blue}
                      strokeWidth={2}
                      fill="url(#favoriteBlueGradient)"
                      dot={{ fill: colors.blue, r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold">
              Périodes d'apparition
            </h4>
            {data.appearances.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Aucune période calculée pour ce favori.
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--surface-secondary)]">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                        Début
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                        Fin
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.appearances.map((appearance, index) => (
                      <tr
                        key={`${appearance.firstSeenAt}-${index}`}
                        className={
                          index % 2 === 0
                            ? ""
                            : "bg-[var(--surface-secondary)]/50"
                        }
                      >
                        <td className="px-4 py-3 text-xs text-[var(--fg)]">
                          {formatDateTime(appearance.firstSeenAt)}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--fg)]">
                          {formatDateTime(appearance.lastSeenAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold">Derniers événements</h4>
            {data.events.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Aucun événement enregistré pour ce favori.
              </p>
            ) : (
              <div className="space-y-3">
                {data.events.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-[var(--border)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--fg)]">
                          {getFavoriteEventLabel(event.eventType)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                        {event.deliveryStatus === "success"
                          ? "Webhook envoyé"
                          : event.deliveryStatus === "error"
                            ? "Webhook en erreur"
                            : "Sans webhook"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[var(--fg)]">
                      {event.productTitle}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      {event.previousPrice !== null && (
                        <span>
                          Prix précédent{" "}
                          {event.previousPrice.toLocaleString("fr-FR")} €
                        </span>
                      )}
                      {event.currentPrice !== null && (
                        <span className="ml-3">
                          Prix actuel{" "}
                          {event.currentPrice.toLocaleString("fr-FR")} €
                        </span>
                      )}
                    </p>
                    {event.deliveryError && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {event.deliveryError}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {data.previousMatches.length > 0 && (
            <section>
              <h4 className="mb-3 text-sm font-semibold">SKU précédents</h4>
              <div className="space-y-2">
                {data.previousMatches.map((product) => (
                  <div
                    key={product.partNumber}
                    className="rounded-2xl border border-[var(--border)] px-4 py-3"
                  >
                    <p className="text-sm font-medium text-[var(--fg)]">
                      {product.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {product.partNumber} · vu pour la dernière fois le{" "}
                      {formatDateTime(product.lastSeen)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
