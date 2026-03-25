"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { PriceHistoryEntry } from "@/lib/types";

interface PriceHistoryChartProps {
  partNumber: string;
  originalPrice: number;
}

export function PriceHistoryChart({
  partNumber,
  originalPrice,
}: PriceHistoryChartProps) {
  const [data, setData] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${encodeURIComponent(partNumber)}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [partNumber]);

  if (loading) {
    return (
      <div className="text-xs text-[var(--muted)] py-4 text-center">
        Chargement...
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="text-xs text-[var(--muted)] py-4 text-center">
        Pas assez de données pour afficher un historique
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.scrapedAt).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    }),
    prix: d.price,
  }));

  return (
    <div className="pt-3">
      <div className="text-xs text-[var(--muted)] mb-2">
        Historique des prix
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#888" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#888" }}
            axisLine={false}
            tickLine={false}
            domain={["dataMin - 50", "dataMax + 50"]}
            tickFormatter={(v) => `${v} €`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value) => [`${Number(value).toLocaleString("fr-FR")} €`, "Prix"]}
          />
          <ReferenceLine
            y={originalPrice}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{
              value: `Neuf: ${originalPrice.toLocaleString("fr-FR")} €`,
              position: "right",
              style: { fontSize: 10, fill: "#ef4444" },
            }}
          />
          <Line
            type="monotone"
            dataKey="prix"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: "#22c55e", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
