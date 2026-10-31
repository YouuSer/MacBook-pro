const PRICE_EPSILON = 0.001;
const DEFAULT_SCRAPE_INTERVAL_MS = 30 * 60 * 1000;
const MIN_APPEARANCE_GAP_MS = 45 * 60 * 1000;

export interface PriceHistoryPeriod {
  partNumber: string;
  price: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface AppearanceStats {
  appearanceCount: number;
  appearanceFirstSeen: string;
  appearanceLastSeen: string;
}

export interface AppearancePeriod {
  firstSeenAt: string;
  lastSeenAt: string;
}

export function isSamePrice(a: number, b: number) {
  return Math.abs(a - b) < PRICE_EPSILON;
}

function getMedian(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export function buildHistoryByPart(rows: PriceHistoryPeriod[]) {
  const historyByPartNumber = new Map<string, PriceHistoryPeriod[]>();

  for (const row of rows) {
    const history = historyByPartNumber.get(row.partNumber);

    if (!history) {
      historyByPartNumber.set(row.partNumber, [row]);
      continue;
    }

    history.push(row);
  }

  return historyByPartNumber;
}

export function estimateAppearanceGapMs(rows: Array<{ scrapedAt: string }>) {
  const timestamps = rows
    .map((row) => new Date(row.scrapedAt).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const intervals: number[] = [];

  for (let index = 1; index < timestamps.length; index++) {
    const interval = timestamps[index] - timestamps[index - 1];

    if (interval > 0) {
      intervals.push(interval);
    }
  }

  const medianInterval = getMedian(intervals) || DEFAULT_SCRAPE_INTERVAL_MS;

  return Math.max(MIN_APPEARANCE_GAP_MS, medianInterval * 1.5);
}

export function mergeAppearancePeriods(
  periods: AppearancePeriod[],
  appearanceGapMs: number
) {
  const sorted = [...periods].sort(
    (a, b) =>
      new Date(a.firstSeenAt).getTime() - new Date(b.firstSeenAt).getTime()
  );
  const merged: AppearancePeriod[] = [];

  for (const period of sorted) {
    const current = merged[merged.length - 1];

    if (!current) {
      merged.push({ ...period });
      continue;
    }

    const gapMs =
      new Date(period.firstSeenAt).getTime() -
      new Date(current.lastSeenAt).getTime();

    if (gapMs > appearanceGapMs) {
      merged.push({ ...period });
      continue;
    }

    if (period.lastSeenAt > current.lastSeenAt) {
      current.lastSeenAt = period.lastSeenAt;
    }
  }

  return merged;
}

export function buildAppearancePeriodsFromHistory(
  rows: Array<Pick<PriceHistoryPeriod, "firstSeenAt" | "lastSeenAt">>,
  appearanceGapMs: number
) {
  return mergeAppearancePeriods(
    rows.map((row) => ({
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
    })),
    appearanceGapMs
  );
}

export function buildAppearanceStats(
  historyByPartNumber: Map<string, PriceHistoryPeriod[]>,
  appearanceGapMs: number
) {
  const statsByPartNumber = new Map<string, AppearanceStats>();

  for (const [partNumber, historyRows] of historyByPartNumber.entries()) {
    if (historyRows.length === 0) {
      continue;
    }

    const appearances = buildAppearancePeriodsFromHistory(
      historyRows,
      appearanceGapMs
    );
    const latestAppearance = appearances[appearances.length - 1];

    statsByPartNumber.set(partNumber, {
      appearanceCount: appearances.length,
      appearanceFirstSeen: latestAppearance.firstSeenAt,
      appearanceLastSeen: latestAppearance.lastSeenAt,
    });
  }

  return statsByPartNumber;
}

export function buildAggregatedPriceHistory(rows: PriceHistoryPeriod[]) {
  if (rows.length === 0) {
    return [];
  }

  const checkpoints = Array.from(
    new Set(
      rows.flatMap((row) => [
        new Date(row.firstSeenAt).getTime(),
        new Date(row.lastSeenAt).getTime(),
      ])
    )
  )
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  const aggregated: PriceHistoryPeriod[] = [];

  for (const checkpoint of checkpoints) {
    const activeRows = rows.filter((row) => {
      const firstSeenAt = new Date(row.firstSeenAt).getTime();
      const lastSeenAt = new Date(row.lastSeenAt).getTime();

      return firstSeenAt <= checkpoint && checkpoint <= lastSeenAt;
    });

    if (activeRows.length === 0) {
      continue;
    }

    const activeRow = [...activeRows].sort((a, b) => {
      if (a.price !== b.price) {
        return a.price - b.price;
      }

      return (
        new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
      );
    })[0];
    const current = aggregated[aggregated.length - 1];
    const isoCheckpoint = new Date(checkpoint).toISOString();

    if (current && isSamePrice(current.price, activeRow.price)) {
      current.lastSeenAt = isoCheckpoint;
      continue;
    }

    aggregated.push({
      partNumber: activeRow.partNumber,
      price: activeRow.price,
      firstSeenAt: isoCheckpoint,
      lastSeenAt: isoCheckpoint,
    });
  }

  return aggregated;
}
