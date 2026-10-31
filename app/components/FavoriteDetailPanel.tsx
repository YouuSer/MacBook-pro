"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { getFavoriteEventLabel, getFavoriteStateLabel } from "@/lib/favorites";
import type { FavoriteDetail } from "@/lib/types";

interface FavoriteDetailPanelProps {
  favoriteId: number;
  isOpen: boolean;
  onClose: () => void;
}

function getCssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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

export function FavoriteDetailPanel({
  favoriteId,
  isOpen,
  onClose,
}: FavoriteDetailPanelProps) {
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
    if (!isOpen) {
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/favorites/${favoriteId}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as FavoriteDetail | { error?: string };

        if (!response.ok || !("favorite" in payload)) {
          throw new Error("error" in payload ? payload.error : "Chargement impossible.");
        }

        setData(payload);
        setLoading(false);
      })
      .catch((loadError) => {
        const message =
          loadError instanceof Error ? loadError.message : "Chargement impossible.";
        setError(message);
        setLoading(false);
      });
  }, [favoriteId, isOpen]);

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
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[500px] bg-[var(--surface)] shadow-[-8px_0_30px_rgb(0_0_0_/_0.1)] z-50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Favori</h3>
              {data && (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {getFavoriteStateLabel(data.favorite.currentState)}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)]"
              aria-label="Fermer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6L18 18M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
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

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Disponibilités actuelles</h4>
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
                  <h4 className="mb-3 text-sm font-semibold">Historique de prix agrégé</h4>
                  {chartData.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)]">
                      Pas assez de données pour afficher un historique.
                    </p>
                  ) : (
                    <div className="rounded-3xl border border-[var(--border)] p-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="favoriteBlueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={colors.blue} stopOpacity={0.2} />
                              <stop offset="100%" stopColor={colors.blue} stopOpacity={0} />
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
                  <h4 className="mb-3 text-sm font-semibold">Périodes d'apparition</h4>
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
                              className={index % 2 === 0 ? "" : "bg-[var(--surface-secondary)]/50"}
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
                                Prix précédent {event.previousPrice.toLocaleString("fr-FR")} €
                              </span>
                            )}
                            {event.currentPrice !== null && (
                              <span className="ml-3">
                                Prix actuel {event.currentPrice.toLocaleString("fr-FR")} €
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
          </div>
        </div>
      </div>
    </>
  );
}
