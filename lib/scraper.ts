import type { Category, ProductLine } from "./product-catalog";
import {
  CATEGORY_DEFINITIONS,
  getProductLineFromTitle,
  normalizeAppleText,
  normalizeProductLine,
  parseChip,
} from "./product-catalog";
import type { AppleRefurbBootstrap, AppleRefurbTile } from "./types";

const REFURB_BASE_URL = "https://www.apple.com/fr/shop/refurbished";

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
  category: Category;
  productLine: ProductLine;
  productLineLabel: string;
  chip: string;
  screenSize: string;
  memory: string;
  storage: string;
  color: string;
  releaseYear: string;
  productUrl: string;
  imageUrl: string;
}

export interface CategoryScrapeResult {
  category: Category;
  products: ScrapedProduct[];
  totalFound: number;
  error: string | null;
}

export function extractBootstrap(html: string): AppleRefurbBootstrap {
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

  return JSON.parse(html.slice(jsonStart, jsonEnd));
}

export function parseBootstrapTiles(
  category: Category,
  data: AppleRefurbBootstrap
): ScrapedProduct[] {
  const modelLabels = {
    ...data.dictionaries?.dimensions?.refurbClearModel,
    ...data.dictionaries?.dimensions?.heroAirPods,
  };

  return (data.tiles ?? []).flatMap((tile) => {
    const normalizedTitle = normalizeAppleText(tile.title);
    const dims = tile.filters.dimensions;
    const modelKey = dims.refurbClearModel ?? dims.heroAirPods;
    // Les clés génériques ("macbookair") sont fiables ; pour AirPods on préfère le titre
    // car la clé Apple ("airpodspro2023") encode l'année et non la génération.
    const productLine =
      getProductLineFromTitle(normalizedTitle) ?? normalizeProductLine(modelKey);

    if (!productLine) {
      return [];
    }

    const currentPrice = parseFloat(tile.price.currentPrice.raw_amount);
    const originalPrice =
      tile.price.originalProductAmount ??
      (tile.price.previousPrice?.raw_amount
        ? parseFloat(tile.price.previousPrice.raw_amount)
        : currentPrice);

    return [{
      partNumber: tile.partNumber,
      title: normalizedTitle,
      currentPrice,
      originalPrice,
      savingsPercent: originalPrice > 0 ? ((originalPrice - currentPrice) / originalPrice) * 100 : 0,
      savings: tile.price.savings,
      category,
      productLine,
      productLineLabel:
        (modelKey && modelLabels[modelKey]?.text && productLine === normalizeProductLine(modelKey)
          ? modelLabels[modelKey].text
          : "") || "",
      chip: parseChip(normalizedTitle) ?? "",
      screenSize: dims.dimensionScreensize ?? "",
      memory: dims.tsMemorySize ?? "",
      storage: dims.dimensionCapacity ?? "",
      color: dims.dimensionColor ?? "",
      releaseYear: dims.dimensionRelYear ?? "",
      productUrl: `https://www.apple.com${tile.productDetailsUrl}`,
      imageUrl: getImageUrl(tile),
    }];
  });
}

async function scrapeCategory(category: Category, path: string): Promise<CategoryScrapeResult> {
  try {
    const res = await fetch(`${REFURB_BASE_URL}/${path}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });

    if (!res.ok) {
      throw new Error(`Apple returned ${res.status}: ${res.statusText}`);
    }

    const data = extractBootstrap(await res.text());
    const products = parseBootstrapTiles(category, data);

    return { category, products, totalFound: data.tiles?.length ?? 0, error: null };
  } catch (error) {
    return {
      category,
      products: [],
      totalFound: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function scrapeAppleRefurb(): Promise<{
  products: ScrapedProduct[];
  totalFound: number;
  failedCategories: Array<{ category: Category; error: string }>;
}> {
  const results = await Promise.all(
    CATEGORY_DEFINITIONS.map((definition) => scrapeCategory(definition.id, definition.path))
  );
  const failedCategories = results.flatMap((result) =>
    result.error ? [{ category: result.category, error: result.error }] : []
  );

  if (failedCategories.length === results.length) {
    throw new Error(failedCategories.map((f) => `${f.category}: ${f.error}`).join(" | "));
  }

  return {
    products: results.flatMap((result) => result.products),
    totalFound: results.reduce((sum, result) => sum + result.totalFound, 0),
    failedCategories,
  };
}
