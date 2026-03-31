import type { ProductLine } from "./product-catalog";
import {
  getProductLineFromTitle,
  isTrackedMacbookTitle,
  normalizeAppleText,
  parseChip,
} from "./product-catalog";
import type { AppleRefurbBootstrap, AppleRefurbTile } from "./types";

const REFURB_URL =
  "https://www.apple.com/fr/shop/refurbished/mac";

function getImageUrl(tile: AppleRefurbTile): string {
  const jpeg = tile.image.sources.find((s) => s.type === "image/jpeg");
  return jpeg?.srcSet ?? tile.image.sources[0]?.srcSet ?? "";
}

export interface ScrapedProduct {
  partNumber: string;
  title: string;
  currentPrice: number;
  originalPrice: number;
  savingsPercent: number;
  savings: string;
  productLine: ProductLine;
  chip: string;
  screenSize: string;
  memory: string;
  storage: string;
  color: string;
  releaseYear: string;
  productUrl: string;
  imageUrl: string;
}

export async function scrapeAppleRefurb(): Promise<{
  products: ScrapedProduct[];
  totalFound: number;
}> {
  const res = await fetch(REFURB_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "fr-FR,fr;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`Apple returned ${res.status}: ${res.statusText}`);
  }

  const html = await res.text();

  // Extract the REFURB_GRID_BOOTSTRAP JSON
  const marker = "window.REFURB_GRID_BOOTSTRAP";
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) {
    throw new Error("Could not find REFURB_GRID_BOOTSTRAP in page");
  }

  const jsonStart = html.indexOf("{", startIdx);

  // Find the matching closing brace, accounting for strings containing braces
  let depth = 0;
  let jsonEnd = jsonStart;
  let inString = false;
  let escape = false;
  for (let i = jsonStart; i < html.length; i++) {
    const ch = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth === 0) {
      jsonEnd = i + 1;
      break;
    }
  }

  const data: AppleRefurbBootstrap = JSON.parse(html.slice(jsonStart, jsonEnd));
  const totalFound = data.tiles.length;

  const trackedTiles = data.tiles.filter((tile) => isTrackedMacbookTitle(tile.title));

  const products: ScrapedProduct[] = trackedTiles.flatMap((tile) => {
    const normalizedTitle = normalizeAppleText(tile.title);
    const productLine = getProductLineFromTitle(normalizedTitle);
    const chip = parseChip(normalizedTitle);

    if (!productLine || !chip) {
      return [];
    }

    const currentPrice = parseFloat(tile.price.currentPrice.raw_amount);
    const originalPrice =
      tile.price.originalProductAmount ??
      (tile.price.previousPrice?.raw_amount
        ? parseFloat(tile.price.previousPrice.raw_amount)
        : currentPrice);
    const dims = tile.filters.dimensions;

    return [{
      partNumber: tile.partNumber,
      title: normalizedTitle,
      currentPrice,
      originalPrice,
      savingsPercent: ((originalPrice - currentPrice) / originalPrice) * 100,
      savings: tile.price.savings,
      productLine,
      chip,
      screenSize: dims.dimensionScreensize ?? "",
      memory: dims.tsMemorySize ?? "",
      storage: dims.dimensionCapacity ?? "",
      color: dims.dimensionColor ?? "",
      releaseYear: dims.dimensionRelYear ?? "",
      productUrl: `https://www.apple.com${tile.productDetailsUrl}`,
      imageUrl: getImageUrl(tile),
    }];
  });

  return { products, totalFound };
}
