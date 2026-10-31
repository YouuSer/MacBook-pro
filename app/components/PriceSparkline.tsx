interface PriceSparklineProps {
  prices: number[];
  muted?: boolean;
}

const WIDTH = 200;
const HEIGHT = 28;

export function PriceSparkline({ prices, muted = false }: PriceSparklineProps) {
  if (prices.length < 2) {
    // Garde la hauteur pour que les cartes d'une même rangée restent alignées.
    return <div style={{ height: HEIGHT }} aria-hidden />;
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  // Paliers de prix : chaque prix tient jusqu'au suivant, comme sur la page Apple.
  const step = WIDTH / prices.length;
  const points = prices.flatMap((price, index) => {
    const y = max === min ? HEIGHT / 2 : 2 + ((max - price) / range) * (HEIGHT - 4);
    return [`${index * step},${y}`, `${(index + 1) * step},${y}`];
  });
  const first = prices[0];
  const last = prices[prices.length - 1];
  const trendLabel =
    last < first
      ? `en baisse de ${(first - last).toLocaleString("fr-FR")} €`
      : last > first
        ? `en hausse de ${(last - first).toLocaleString("fr-FR")} €`
        : "stable";

  return (
    <svg
      width="100%"
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Historique de prix : ${prices.length} paliers, ${trendLabel}`}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={muted ? "var(--text-tertiary)" : "var(--accent-blue)"}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
