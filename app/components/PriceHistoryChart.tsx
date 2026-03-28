"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { PriceHistoryEntry } from "@/lib/types";

interface PriceHistoryChartProps {
  source: string;
  productId: string;
  originalPrice: number;
}

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function PriceHistoryChart({
  source,
  productId,
  originalPrice,
}: PriceHistoryChartProps) {
  const [data, setData] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
    setError(false);
    fetch(`/api/products/${encodeURIComponent(productId)}?source=${encodeURIComponent(source)}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [source, productId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent-blue)] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[var(--text-secondary)] mb-2">
          Impossible de charger l'historique
        </p>
        <button
          onClick={() => {
            setLoading(true);
            setError(false);
            fetch(`/api/products/${encodeURIComponent(productId)}?source=${encodeURIComponent(source)}`)
              .then((res) => res.json())
              .then((d) => { setData(d); setLoading(false); })
              .catch(() => { setError(true); setLoading(false); });
          }}
          className="text-xs text-[var(--accent-blue)] hover:underline"
        >
          Reessayer
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[var(--text-secondary)]">
          Pas assez de donnees pour afficher un historique
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.firstSeenAt).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    }),
    prix: d.price,
  }));

  const tableData = [...data].reverse();

  return (
    <div>
      <div className="text-xs text-[var(--text-secondary)] mb-4">
        Evolution du prix
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
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
          <ReferenceLine
            y={originalPrice}
            stroke="var(--accent-red)"
            strokeDasharray="3 3"
            label={{
              value: `Neuf: ${originalPrice.toLocaleString("fr-FR")} €`,
              position: "right",
              style: { fontSize: 10, fill: "var(--accent-red)" },
            }}
          />
          <Area
            type="monotone"
            dataKey="prix"
            stroke={colors.blue}
            strokeWidth={2}
            fill="url(#blueGradient)"
            dot={{ fill: colors.blue, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Tableau detail prix par periode */}
      <div className="mt-6">
        <div className="text-xs text-[var(--text-secondary)] mb-3">
          Detail par periode
        </div>
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface-secondary)]">
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-2.5">
                  Du
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-4 py-2.5">
                  Au
                </th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-4 py-2.5">
                  Prix
                </th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((entry, i) => {
                const fmt = (iso: string) => {
                  const d = new Date(iso);
                  return {
                    date: d.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "Europe/Paris",
                    }),
                    time: d.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Paris",
                    }),
                  };
                };
                const from = fmt(entry.firstSeenAt);
                const to = fmt(entry.lastSeenAt);
                const isSame = entry.firstSeenAt === entry.lastSeenAt;

                return (
                  <tr
                    key={`${entry.firstSeenAt}-${i}`}
                    className={i % 2 === 0 ? "" : "bg-[var(--surface-secondary)]/50"}
                  >
                    <td className="px-4 py-2 text-xs text-[var(--fg)]">
                      {from.date}{" "}
                      <span className="text-[var(--text-tertiary)]">{from.time}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--fg)]">
                      {isSame ? (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      ) : (
                        <>
                          {to.date}{" "}
                          <span className="text-[var(--text-tertiary)]">{to.time}</span>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs font-semibold text-[var(--fg)] text-right">
                      {entry.price.toLocaleString("fr-FR")} €
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
