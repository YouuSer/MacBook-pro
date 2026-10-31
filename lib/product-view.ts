import {
  buildFavoriteConfigKey,
  getBestFavoriteMatch,
  matchesFavoriteConfig,
  normalizeFavoriteConfigKey,
  toFavoriteProductMatch,
  type FavoriteTrackedProductRow,
} from "./favorites";
import {
  getProductLineLabel,
  parseCoreCounts,
  resolveCategory,
  resolveProductLine,
} from "./product-catalog";
import {
  buildAggregatedPriceHistory,
  buildAppearancePeriodsFromHistory,
  buildAppearanceStats,
  buildHistoryByPart,
  estimateAppearanceGapMs,
  isSamePrice,
  type PriceHistoryPeriod,
} from "./tracking";
import type {
  FavoriteConfig,
  FavoriteDetail,
  FavoriteEvent,
  Product,
} from "./types";

export interface ProductRowView {
  partNumber: string;
  title: string;
  currentPrice: number;
  originalPrice: number;
  savingsPercent: number;
  savings: string | null;
  category?: string | null;
  productLine: string | null;
  productLineLabel?: string | null;
  chip: string | null;
  screenSize: string | null;
  memory: string | null;
  storage: string | null;
  color: string | null;
  releaseYear: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  firstSeen: string;
  lastSeen: string;
}

export interface FavoriteConfigRowView {
  id: number;
  configKey: string;
  label: string;
  sourcePartNumber: string;
  currentState: string;
  bestCurrentPrice: number | null;
  lastMatchedAt: string | null;
  lastEventAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteEventRowView {
  id: number;
  favoriteId: number;
  eventType: string;
  partNumber: string;
  productTitle: string;
  currentPrice: number | null;
  previousPrice: number | null;
  createdAt: string;
  deliveryStatus: string | null;
  deliveryError: string | null;
  deliveredAt: string | null;
}

function getPreviousDistinctPrice(
  currentPrice: number,
  historyRows: PriceHistoryPeriod[]
) {
  for (let index = historyRows.length - 1; index >= 0; index--) {
    if (!isSamePrice(historyRows[index].price, currentPrice)) {
      return historyRows[index].price;
    }
  }

  return null;
}

function getPriceTrend(
  currentPrice: number,
  previousPrice: number | null
): Product["priceTrend"] {
  if (previousPrice === null) {
    return null;
  }

  if (currentPrice < previousPrice) {
    return "down";
  }

  if (currentPrice > previousPrice) {
    return "up";
  }

  return null;
}

function toFavoriteMatchableRow(row: ProductRowView): FavoriteTrackedProductRow | null {
  const productLine = resolveProductLine(row.productLine, row.title);

  if (!productLine) {
    return null;
  }

  return {
    partNumber: row.partNumber,
    title: row.title,
    currentPrice: row.currentPrice,
    productLine,
    chip: row.chip,
    screenSize: row.screenSize,
    memory: row.memory,
    storage: row.storage,
    color: row.color,
    releaseYear: row.releaseYear,
    productUrl: row.productUrl,
    imageUrl: row.imageUrl,
    lastSeen: row.lastSeen,
  };
}

export function buildProducts(args: {
  rows: ProductRowView[];
  historyRows: PriceHistoryPeriod[];
  successfulRuns: Array<{ scrapedAt: string }>;
  favoriteRows?: FavoriteConfigRowView[];
}) {
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();
  const favoriteByConfigKey = new Map(
    (args.favoriteRows ?? []).map((favorite) => [normalizeFavoriteConfigKey(favorite.configKey), favorite])
  );
  const historyByPartNumber = buildHistoryByPart(args.historyRows);
  const appearanceGapMs = estimateAppearanceGapMs(args.successfulRuns);
  const appearanceStatsByPartNumber = buildAppearanceStats(
    historyByPartNumber,
    appearanceGapMs
  );

  return args.rows.map((row) => {
    const resolvedProductLine = resolveProductLine(row.productLine, row.title) ?? "macbookpro";
    const { cpuCores, gpuCores } = parseCoreCounts(row.title);
    const priceHistoryForProduct = historyByPartNumber.get(row.partNumber) ?? [];
    const appearanceStats = appearanceStatsByPartNumber.get(row.partNumber) ?? {
      appearanceCount: 1,
      appearanceFirstSeen: row.firstSeen,
      appearanceLastSeen: row.lastSeen,
    };
    const previousPrice = getPreviousDistinctPrice(
      row.currentPrice,
      priceHistoryForProduct
    );
    const favorite = favoriteByConfigKey.get(
      buildFavoriteConfigKey({
        title: row.title,
        partNumber: row.partNumber,
        productLine: resolvedProductLine,
        chip: row.chip ?? "",
        screenSize: row.screenSize ?? "",
        memory: row.memory ?? "",
        storage: row.storage ?? "",
        color: row.color ?? "",
        releaseYear: row.releaseYear ?? "",
      })
    );

    return {
      partNumber: row.partNumber,
      title: row.title,
      currentPrice: row.currentPrice,
      previousPrice,
      priceTrend: getPriceTrend(row.currentPrice, previousPrice),
      appearanceCount: appearanceStats.appearanceCount,
      appearanceFirstSeen: appearanceStats.appearanceFirstSeen,
      appearanceLastSeen: appearanceStats.appearanceLastSeen,
      originalPrice: row.originalPrice,
      savingsPercent: row.savingsPercent,
      savings: row.savings ?? "",
      category: resolveCategory(row.category, resolvedProductLine),
      productLine: resolvedProductLine,
      productLineLabel: getProductLineLabel(resolvedProductLine, row.productLineLabel),
      chip: row.chip ?? "",
      cpuCores,
      gpuCores,
      screenSize: row.screenSize ?? "",
      memory: row.memory ?? "",
      storage: row.storage ?? "",
      color: row.color ?? "",
      releaseYear: row.releaseYear ?? "",
      productUrl: row.productUrl ?? "",
      imageUrl: row.imageUrl ?? "",
      firstSeen: row.firstSeen,
      lastSeen: row.lastSeen,
      isNew: appearanceStats.appearanceFirstSeen >= twentyFourHoursAgo,
      isFavorite: Boolean(favorite),
      favoriteId: favorite?.id ?? null,
    } satisfies Product;
  });
}

export function buildFavoriteConfigsView(args: {
  favorites: FavoriteConfigRowView[];
  productRows: ProductRowView[];
  currentScrapedAt: string | null;
}) {
  const matchableProducts = args.productRows
    .map((row) => {
      const matchable = toFavoriteMatchableRow(row);
      return matchable ? toFavoriteProductMatch(matchable) : null;
    })
    .filter((row): row is NonNullable<ReturnType<typeof toFavoriteProductMatch>> => row !== null);

  return [...args.favorites]
    .map((favorite) => {
      const matchingProducts = matchableProducts.filter((product) =>
        matchesFavoriteConfig(product, favorite.configKey)
      );
      const currentMatches =
        args.currentScrapedAt === null
          ? []
          : matchingProducts.filter(
              (product) => product.lastSeen === args.currentScrapedAt
            );
      const currentMatch = getBestFavoriteMatch(currentMatches);
      const fallbackMatch =
        matchingProducts.find(
          (product) => product.partNumber === favorite.sourcePartNumber
        ) ??
        [...matchingProducts].sort((a, b) => {
          if (a.lastSeen !== b.lastSeen) {
            return b.lastSeen.localeCompare(a.lastSeen);
          }

          return a.currentPrice - b.currentPrice;
        })[0] ??
        null;
      const representative = currentMatch ?? fallbackMatch;

      return {
        id: favorite.id,
        configKey: favorite.configKey,
        label: favorite.label,
        sourcePartNumber: favorite.sourcePartNumber,
        currentState:
          favorite.currentState === "available" ? "available" : "unavailable",
        bestCurrentPrice: favorite.bestCurrentPrice,
        lastMatchedAt: favorite.lastMatchedAt,
        lastEventAt: favorite.lastEventAt,
        createdAt: favorite.createdAt,
        updatedAt: favorite.updatedAt,
        currentPartNumber: currentMatch?.partNumber ?? null,
        productUrl: representative?.productUrl ?? null,
        imageUrl: representative?.imageUrl ?? null,
        currentMatchCount: currentMatches.length,
      } satisfies FavoriteConfig;
    })
    .sort((a, b) => {
      if (a.currentState !== b.currentState) {
        return a.currentState === "available" ? -1 : 1;
      }

      const aDate = a.lastEventAt ?? a.updatedAt;
      const bDate = b.lastEventAt ?? b.updatedAt;

      return bDate.localeCompare(aDate);
    });
}

export function buildFavoriteDetail(args: {
  favorite: FavoriteConfigRowView;
  productRows: ProductRowView[];
  historyRows: PriceHistoryPeriod[];
  successfulRuns: Array<{ scrapedAt: string }>;
  currentScrapedAt: string | null;
  eventRows: FavoriteEventRowView[];
}) {
  const favoriteView = buildFavoriteConfigsView({
    favorites: [args.favorite],
    productRows: args.productRows,
    currentScrapedAt: args.currentScrapedAt,
  })[0];
  const products = buildProducts({
    rows: args.productRows,
    historyRows: args.historyRows,
    successfulRuns: args.successfulRuns,
    favoriteRows: [args.favorite],
  }).filter((product) => product.favoriteId === args.favorite.id);
  const matchingPartNumbers = new Set(products.map((product) => product.partNumber));
  const matchingHistory = args.historyRows.filter((row) =>
    matchingPartNumbers.has(row.partNumber)
  );
  const appearanceGapMs = estimateAppearanceGapMs(args.successfulRuns);
  const appearances = buildAppearancePeriodsFromHistory(
    matchingHistory,
    appearanceGapMs
  );
  const aggregatedHistory = buildAggregatedPriceHistory(matchingHistory).map(
    (entry) => ({
      price: entry.price,
      firstSeenAt: entry.firstSeenAt,
      lastSeenAt: entry.lastSeenAt,
    })
  );
  const currentMatches =
    args.currentScrapedAt === null
      ? []
      : products
          .filter((product) => product.lastSeen === args.currentScrapedAt)
          .sort((a, b) => a.currentPrice - b.currentPrice);
  const previousMatches = products
    .filter((product) => product.lastSeen !== args.currentScrapedAt)
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  const events = [...args.eventRows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(
      (event) =>
        ({
          id: event.id,
          favoriteId: event.favoriteId,
          eventType:
            event.eventType === "reappearance" ||
            event.eventType === "expiration"
              ? event.eventType
              : "price_drop",
          partNumber: event.partNumber,
          productTitle: event.productTitle,
          currentPrice: event.currentPrice,
          previousPrice: event.previousPrice,
          createdAt: event.createdAt,
          deliveryStatus:
            event.deliveryStatus === "success" || event.deliveryStatus === "error"
              ? event.deliveryStatus
              : null,
          deliveryError: event.deliveryError,
          deliveredAt: event.deliveredAt,
        }) satisfies FavoriteEvent
    );

  return {
    favorite: favoriteView,
    currentMatches,
    previousMatches,
    appearances,
    priceHistory: aggregatedHistory,
    events,
  } satisfies FavoriteDetail;
}
