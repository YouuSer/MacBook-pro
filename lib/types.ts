import type { ProductLine } from "./product-catalog";

export type PriceTrend = "up" | "down";

// Types pour les données brutes Apple Refurb

export interface AppleRefurbBootstrap {
  tiles: AppleRefurbTile[];
  dimensions: AppleRefurbDimension[];
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
  originalPrice: number;
  savingsPercent: number;
  savings: string;
  productLine: ProductLine;
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
}

export interface PriceHistoryEntry {
  price: number;
  firstSeenAt: string;
  lastSeenAt: string;
}
