import { describe, expect, it } from "vitest";
import {
  buildFacetOptions,
  createDefaultFilterState,
  parseFilterState,
  serializeFilterState,
} from "../lib/catalog-filters";
import { matchesFavoriteConfig, buildFavoriteConfigKey } from "../lib/favorites";
import {
  getCategoryForProductLine,
  getProductLineFromTitle,
  getProductLineLabel,
  parseChip,
} from "../lib/product-catalog";
import { parseBootstrapTiles } from "../lib/scraper";
import type { AppleRefurbTile, Product } from "../lib/types";

describe("product classification", () => {
  it.each([
    ["Mac mini reconditionné avec puce Apple M4, CPU 10 cœurs, GPU 10 cœurs", "macmini"],
    ["MacBook Neo reconditionné avec puce Apple A18 Pro - Argent", "macbookneo"],
    ["iMac 24 pouces reconditionné avec puce Apple M4", "imac"],
    ["iPhone 16 Pro Max 256 Go reconditionné - Titane noir (déverrouillé)", "iphone16promax"],
    ["AirPods Pro 2 reconditionnés", "airpodspro2"],
    ["HomePod reconditionné (2ᵉ génération) - Minuit", "homepod"],
    ["Apple TV 4K reconditionnée", "appletv4k"],
  ])("classifies %s", (title, expected) => {
    expect(getProductLineFromTitle(title)).toBe(expected);
  });

  it("maps families to categories and labels", () => {
    expect(getCategoryForProductLine("iphone16plus")).toBe("iphone");
    expect(getCategoryForProductLine("macmini")).toBe("mac");
    expect(getProductLineLabel("iphone16promax")).toBe("iPhone 16 Pro Max");
    expect(getProductLineLabel("airpodspro2")).toBe("AirPods Pro 2");
  });

  it("parses A-series and Max chips", () => {
    expect(parseChip("MacBook Neo avec puce Apple A18 Pro")).toBe("A18 Pro");
    expect(parseChip("MacBook Pro avec puce Apple M4 Max")).toBe("M4 Max");
  });
});

describe("bootstrap parsing", () => {
  it("handles empty categories and uses Apple model labels", () => {
    expect(parseBootstrapTiles("airpods", { tiles: null, dimensions: null })).toEqual([]);

    const tile = {
      title: "iPhone 16 128 Go reconditionné - Noir (déverrouillé)",
      partNumber: "FXXX1ZD/A",
      productDetailsUrl: "/fr/shop/product/FXXX1ZD/A",
      price: {
        currentPrice: { amount: "839,00 €", raw_amount: "839.00" },
        previousPrice: { amount: null, raw_amount: "969.00", previousPrice: "" },
        originalProductAmount: 969,
        savings: "130,00 €",
        priceCurrency: "EUR",
      },
      image: { sources: [{ srcSet: "img.jpg", type: "image/jpeg" }], width: "", height: "", imageName: "", alt: "" },
      filters: { dimensions: { dimensionCapacity: "128gb", refurbClearModel: "iphone16", dimensionColor: "black" } },
    } as unknown as AppleRefurbTile;

    const [product] = parseBootstrapTiles("iphone", {
      tiles: [tile],
      dimensions: null,
      dictionaries: { dimensions: { refurbClearModel: { iphone16: { sortOrder: 0, text: "iPhone 16" } } } },
    });

    expect(product).toMatchObject({
      category: "iphone",
      productLine: "iphone16",
      productLineLabel: "iPhone 16",
      storage: "128gb",
      chip: "",
    });
  });
});

function makeProduct(overrides: Partial<Product>): Product {
  return {
    partNumber: "X",
    title: "MacBook Pro",
    currentPrice: 1000,
    previousPrice: null,
    priceTrend: null,
    appearanceCount: 1,
    appearanceFirstSeen: "2026-01-01T00:00:00.000Z",
    appearanceLastSeen: "2026-01-01T00:00:00.000Z",
    originalPrice: 1200,
    savingsPercent: 16,
    savings: "",
    category: "mac",
    productLine: "macbookpro",
    productLineLabel: "MacBook Pro",
    chip: "M4",
    cpuCores: "",
    gpuCores: "",
    screenSize: "14inch",
    memory: "16gb",
    storage: "512gb",
    color: "silver",
    releaseYear: "2024",
    productUrl: "",
    imageUrl: "",
    firstSeen: "2026-01-01T00:00:00.000Z",
    lastSeen: "2026-01-01T00:00:00.000Z",
    isNew: false,
    isFavorite: false,
    favoriteId: null,
    ...overrides,
  };
}

describe("historical facets", () => {
  it("keeps chips that only exist on expired offers", () => {
    const products = [
      makeProduct({ partNumber: "A", chip: "M4" }),
      makeProduct({ partNumber: "B", chip: "M3 Pro" }),
      makeProduct({ partNumber: "C", chip: "M3 Pro" }),
      makeProduct({ partNumber: "D", category: "iphone", productLine: "iphone16", chip: "" }),
    ];
    const groups = buildFacetOptions({
      products,
      isAvailable: (product) => product.partNumber === "A",
      state: createDefaultFilterState("mac"),
      colorLabel: (color) => color,
    });
    const chips = groups.find((group) => group.key === "chips")!.options;

    expect(chips).toEqual([
      { value: "M3 Pro", label: "M3 Pro", available: 0, total: 2 },
      { value: "M4", label: "M4", available: 1, total: 1 },
    ]);
  });

  it("round-trips filter state through the URL", () => {
    const state = createDefaultFilterState("iphone");
    state.facets.storages = ["256GB"];
    state.includeExpired = false;

    expect(parseFilterState(serializeFilterState(state))).toEqual(state);
  });
});

describe("legacy favorites", () => {
  it("matches favorites created with the old air/pro keys", () => {
    const product = {
      title: "MacBook Pro 14 pouces avec puce Apple M5, CPU 10 cœurs, GPU 10 cœurs",
      partNumber: "P1",
      productLine: "macbookpro",
      chip: "M5",
      screenSize: "14inch",
      memory: "16gb",
      storage: "512gb",
      color: "spaceblack",
      releaseYear: "2025",
    };
    const legacyKey = buildFavoriteConfigKey(product).replace(/^macbookpro\|/, "pro|");

    expect(matchesFavoriteConfig(product, legacyKey)).toBe(true);
  });
});
