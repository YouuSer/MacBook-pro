import { describe, expect, it } from "vitest";
import {
  buildDealContext,
  getChipScore,
  getDealInsights,
  getDevFitScore,
  NOTABLE_DEAL_SCORE,
} from "../lib/deal-score";
import {
  getProductFilterOptions,
  matchesProductFilters,
  normalizeProductFilters,
} from "../lib/product-filters";
import {
  buildFacetOptions,
  createDefaultFilterState,
  matchesQuery,
  parseFilterState,
  serializeFilterState,
} from "../lib/catalog-filters";
import { buildCatalogStats, buildDealInsights, buildFamilyGroups, pickTop } from "../lib/catalog-view";
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
    priceSeries: [],
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
    state.query = "M4 Pro";

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

describe("search", () => {
  const product = makeProduct({
    title: "MacBook Pro 14 pouces avec puce Apple M4 Pro, CPU 12 cœurs",
    chip: "M4 Pro",
    memory: "24gb",
  });

  it("matches every typed word, ignoring accents and capacity spacing", () => {
    expect(matchesQuery(product, "m4 pro 24 Go")).toBe(true);
    expect(matchesQuery(product, "coeurs")).toBe(true);
    expect(matchesQuery(product, "M4 Max")).toBe(false);
    expect(matchesQuery(product, "m4")).toBe(true);
    expect(matchesQuery(makeProduct({ chip: "M4", title: "MacBook Pro avec puce Apple M4" }), "M4 Pro")).toBe(false);
    expect(matchesQuery(product, "  ")).toBe(true);
  });
});

describe("catalog view", () => {
  const available = [
    makeProduct({ partNumber: "A", productLine: "macbookair", productLineLabel: "MacBook Air", isNew: true }),
    makeProduct({ partNumber: "B", priceTrend: "down", isFavorite: true }),
    makeProduct({ partNumber: "C", category: "iphone", productLine: "iphone16", productLineLabel: "iPhone 16" }),
  ];
  const expired = [makeProduct({ partNumber: "D", chip: "M3 Pro" })];

  it("groups by family in Apple order with expired offers apart", () => {
    const groups = buildFamilyGroups({
      available,
      expired,
      filters: createDefaultFilterState("mac"),
      dealInsights: new Map(),
    });

    expect(groups.map((group) => [group.label, group.available.length, group.expired.length])).toEqual([
      ["MacBook Air", 1, 0],
      ["MacBook Pro", 1, 1],
    ]);
  });

  it("hides expired offers when asked", () => {
    const filters = { ...createDefaultFilterState("mac"), includeExpired: false };
    const groups = buildFamilyGroups({ available, expired, filters, dealInsights: new Map() });

    expect(groups.flatMap((group) => group.expired)).toEqual([]);
  });

  it("summarises the active category", () => {
    expect(buildCatalogStats(available, "mac")).toEqual({
      available: 2,
      newToday: 1,
      priceDrops: 1,
      favoritesAvailable: 1,
    });
  });
});

describe("product display", () => {
  it("builds Apple-style short titles and spec lines", async () => {
    const { getShortTitle, getSpecLine } = await import("../lib/product-display");
    const mac = makeProduct({ chip: "M4 Pro", cpuCores: "12", gpuCores: "16", memory: "24gb", color: "spaceblack" });
    const iphone = makeProduct({
      category: "iphone",
      productLine: "iphone16pro",
      productLineLabel: "iPhone 16 Pro",
      chip: "",
      screenSize: "",
      memory: "",
      storage: "256gb",
      color: "deserttitanium",
    });

    expect(getShortTitle(mac)).toBe('MacBook Pro 14" M4 Pro');
    expect(getSpecLine(mac)).toBe("CPU 12 · GPU 16 · 24 Go · 512 Go · Noir sidéral");
    expect(getShortTitle(iphone)).toBe("iPhone 16 Pro");
    expect(getSpecLine(iphone)).toBe("256 Go · Titane sable");
  });
});

describe("deal score", () => {
  it("rewards the lowest price ever seen for a config over a big Apple discount", () => {
    const cheapNow = makeProduct({
      partNumber: "A",
      currentPrice: 1000,
      priceSeries: [1200, 1150, 1000],
      appearanceCount: 5,
      savingsPercent: 10,
    });
    const atUsualPrice = makeProduct({
      partNumber: "B",
      chip: "M4 Max",
      currentPrice: 3000,
      priceSeries: [2800, 3000],
      appearanceCount: 5,
      savingsPercent: 20,
    });
    const context = buildDealContext([cheapNow, atUsualPrice], [cheapNow, atUsualPrice]);
    const cheap = getDealInsights(cheapNow, context);
    const usual = getDealInsights(atUsualPrice, context);

    expect(cheap.dealScore).toBeGreaterThan(usual.dealScore);
    expect(cheap.reasons[0]).toBe("plus bas prix vu pour cette config");
    expect(cheap.configLowestPrice).toBe(1000);
  });

  it("uses expired offers of the same config as price history", () => {
    const expired = makeProduct({ partNumber: "OLD", currentPrice: 900, priceSeries: [900] });
    const current = makeProduct({ partNumber: "NEW", currentPrice: 1100, priceSeries: [1100] });
    const insights = getDealInsights(current, buildDealContext([current], [current, expired]));

    expect(insights.configLowestPrice).toBe(900);
    expect(insights.reasons).not.toContain("plus bas prix vu pour cette config");
  });

  it("flags the cheapest of equivalent configs available together", () => {
    const silver = makeProduct({ partNumber: "S", color: "silver", currentPrice: 1000 });
    const black = makeProduct({ partNumber: "K", color: "spaceblack", currentPrice: 1100 });
    const insights = getDealInsights(silver, buildDealContext([silver, black], [silver, black]));

    expect(insights.reasons).toContain("la moins chère des 2 configs équivalentes");
  });

  it("only promotes a family top pick above the notable threshold", () => {
    const flat = makeProduct({ partNumber: "F", priceSeries: [1000, 1000], appearanceCount: 10, savingsPercent: 5 });
    const insights = buildDealInsights([flat], [flat]);

    expect(insights.get("F")!.dealScore).toBeLessThan(NOTABLE_DEAL_SCORE);
    expect(pickTop([flat], insights)).toBeNull();
  });

  it("scores chips generically, including Max and A-series", () => {
    expect(getChipScore("M4 Max")).toBeGreaterThan(getChipScore("M4 Pro"));
    expect(getChipScore("M4 Pro")).toBeGreaterThan(getChipScore("M4"));
    expect(getChipScore("M3 Ultra")).toBeGreaterThan(getChipScore("M3 Max"));
    expect(getChipScore("A18 Pro")).toBe(30);
  });

  it("computes a dev profile for Macs only", () => {
    expect(getDevFitScore(makeProduct({ chip: "M4 Max", memory: "48gb" }))!).toBeGreaterThan(
      getDevFitScore(makeProduct({ chip: "M4", memory: "16gb" }))!
    );
    expect(getDevFitScore(makeProduct({ category: "iphone", productLine: "iphone16pro" }))).toBeNull();
  });
});

describe("alert category filter", () => {
  it("restricts rules to the selected categories", () => {
    const filters = normalizeProductFilters({ categories: ["mac"] });
    const base = { chip: "", memory: "", storage: "", screenSize: "" };

    expect(matchesProductFilters({ ...base, productLine: "macmini" }, filters)).toBe(true);
    expect(matchesProductFilters({ ...base, productLine: "iphone16pro" }, filters)).toBe(false);
    expect(matchesProductFilters({ ...base, productLine: "pro" }, filters)).toBe(true);
  });

  it("drops unknown categories and lists only categories present in DB", () => {
    expect(normalizeProductFilters({ categories: ["mac", "ipad" as never] }).categories).toEqual(["mac"]);
    const base = { chip: "", memory: "", storage: "", screenSize: "" };
    expect(
      getProductFilterOptions([
        { ...base, productLine: "homepod" },
        { ...base, productLine: "macbookair" },
      ]).categories
    ).toEqual(["mac", "homepod"]);
  });
});
