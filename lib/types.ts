import type { Category, ProductLine } from "./product-catalog";

export type PriceTrend = "up" | "down";
export type FavoriteState = "available" | "unavailable";
export type FavoriteEventType = "reappearance" | "expiration" | "price_drop";
export type FavoriteDeliveryStatus = "success" | "error";
export type FavoriteNotificationChannelType = "discord" | "slack";

// Types pour les données brutes Apple Refurb

export interface AppleRefurbBootstrap {
  tiles: AppleRefurbTile[] | null;
  dimensions: AppleRefurbDimension[] | null;
  dictionaries?: {
    dimensions?: Record<string, Record<string, { sortOrder: number; text: string }>>;
  };
}

export interface AppleRefurbDimension {
  legend: string;
  sortOrder: number;
  key: string;
}

export interface AppleRefurbTile {
  title: string;
  partNumber: string;
  productDetailsUrl: string;
  lob: string;
  sortOrder: number;
  sort: {
    priceAsc: number;
    priceDesc: number;
  };
  price: {
    currentPrice: {
      amount: string;
      raw_amount: string;
    };
    previousPrice: {
      amount: string | null;
      raw_amount: string;
      previousPrice: string;
    };
    originalProductAmount: number;
    savings: string;
    priceCurrency: string;
  };
  image: {
    sources: Array<{
      srcSet: string;
      type: string;
    }>;
    width: string;
    height: string;
    imageName: string;
    alt: string;
  };
  filters: {
    dimensions: {
      dimensionCapacity?: string;
      refurbClearModel?: string;
      heroAirPods?: string;
      dimensionRelYear?: string;
      dimensionColor?: string;
      tsMemorySize?: string;
      dimensionScreensize?: string;
    };
  };
}

// Types internes pour l'app

export interface Product {
  partNumber: string;
  title: string;
  currentPrice: number;
  previousPrice: number | null;
  priceTrend: PriceTrend | null;
  priceSeries: number[];
  appearanceCount: number;
  appearanceFirstSeen: string;
  appearanceLastSeen: string;
  originalPrice: number;
  savingsPercent: number;
  savings: string;
  category: Category;
  productLine: ProductLine;
  productLineLabel: string;
  chip: string;
  cpuCores: string;
  gpuCores: string;
  screenSize: string;
  memory: string;
  storage: string;
  color: string;
  releaseYear: string;
  productUrl: string;
  imageUrl: string;
  firstSeen: string;
  lastSeen: string;
  isNew: boolean;
  isFavorite: boolean;
  favoriteId: number | null;
}

export interface PriceHistoryEntry {
  price: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface FavoriteConfig {
  id: number;
  configKey: string;
  label: string;
  sourcePartNumber: string;
  currentState: FavoriteState;
  bestCurrentPrice: number | null;
  lastMatchedAt: string | null;
  lastEventAt: string | null;
  createdAt: string;
  updatedAt: string;
  currentPartNumber: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  currentMatchCount: number;
}

export interface FavoriteEvent {
  id: number;
  favoriteId: number;
  eventType: FavoriteEventType;
  partNumber: string;
  productTitle: string;
  currentPrice: number | null;
  previousPrice: number | null;
  createdAt: string;
  deliveryStatus: FavoriteDeliveryStatus | null;
  deliveryError: string | null;
  deliveredAt: string | null;
}

export interface FavoriteNotificationSettings {
  id: number;
  enabled: boolean;
  channelType: FavoriteNotificationChannelType;
  webhookUrl: string;
  triggers: FavoriteEventType[];
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteAppearancePeriod {
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface FavoriteDetail {
  favorite: FavoriteConfig;
  currentMatches: Product[];
  previousMatches: Product[];
  appearances: FavoriteAppearancePeriod[];
  priceHistory: PriceHistoryEntry[];
  events: FavoriteEvent[];
}
