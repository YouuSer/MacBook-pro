import {
  CATEGORIES,
  compareProductLines,
  formatScreenSize,
  getCategoryDefinition,
  normalizeScreenSize,
  type Category,
  type FilterKey,
} from "./product-catalog";
import { normalizeFilterTextValue, sortSpecValues } from "./product-filters";
import type { Product } from "./types";

export type FacetKey = FilterKey | "priceMovements";

export type SortOption =
  | "best-deal"
  | "discount"
  | "price-asc"
  | "price-desc"
  | "ram-desc"
  | "storage-desc"
  | "appearances-desc"
  | "newest";

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "best-deal", label: "Meilleure affaire" },
  { value: "discount", label: "Remise" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "ram-desc", label: "RAM" },
  { value: "storage-desc", label: "Stockage" },
  { value: "appearances-desc", label: "Apparitions" },
  { value: "newest", label: "Plus récents" },
];

export const FACET_LABELS: Record<FacetKey, string> = {
  productLines: "Modèle",
  chips: "Puce",
  memories: "Mémoire",
  storages: "Stockage",
  screenSizes: "Écran",
  colors: "Couleur",
  priceMovements: "Évolution du prix",
};

export interface CatalogFilterState {
  category: Category;
  facets: Record<FacetKey, string[]>;
  favoritesOnly: boolean;
  includeExpired: boolean;
  sort: SortOption;
}

export interface FacetOption {
  value: string;
  label: string;
  available: number;
  total: number;
}

const FACET_KEYS: FacetKey[] = [
  "productLines",
  "chips",
  "memories",
  "storages",
  "screenSizes",
  "colors",
  "priceMovements",
];

const URL_PARAM_BY_FACET: Record<FacetKey, string> = {
  productLines: "model",
  chips: "chip",
  memories: "ram",
  storages: "ssd",
  screenSizes: "screen",
  colors: "color",
  priceMovements: "trend",
};

export function createEmptyFacets(): Record<FacetKey, string[]> {
  return Object.fromEntries(FACET_KEYS.map((key) => [key, []])) as unknown as Record<
    FacetKey,
    string[]
  >;
}

export function createDefaultFilterState(category: Category = "mac"): CatalogFilterState {
  return {
    category,
    facets: createEmptyFacets(),
    favoritesOnly: false,
    includeExpired: true,
    sort: "best-deal",
  };
}

export function getFacetKeysForCategory(category: Category): FacetKey[] {
  return [...getCategoryDefinition(category).filters, "priceMovements"];
}

function formatCapacity(value: string) {
  return value.replace(/(\d)\s*GB$/, "$1 Go").replace(/(\d)\s*TB$/, "$1 To");
}

export function getFacetValue(product: Product, key: FacetKey): string {
  switch (key) {
    case "productLines":
      return product.productLine;
    case "chips":
      return product.chip;
    case "memories":
      return normalizeFilterTextValue(product.memory);
    case "storages":
      return normalizeFilterTextValue(product.storage);
    case "screenSizes":
      return normalizeScreenSize(product.screenSize);
    case "colors":
      return product.color.trim().toLowerCase().replace(/[^a-z]/g, "");
    case "priceMovements":
      return product.priceTrend ?? "";
  }
}

function getFacetLabel(
  product: Product,
  key: FacetKey,
  value: string,
  colorLabel: (color: string) => string
) {
  switch (key) {
    case "productLines":
      return product.productLineLabel;
    case "memories":
    case "storages":
      return formatCapacity(value);
    case "screenSizes":
      return formatScreenSize(value) ?? value;
    case "colors":
      return colorLabel(value);
    case "priceMovements":
      return value === "down" ? "En baisse" : "En hausse";
    default:
      return value;
  }
}

function sortFacetValues(key: FacetKey, values: string[]) {
  switch (key) {
    case "productLines":
      return [...values].sort(compareProductLines);
    case "memories":
    case "storages":
      return sortSpecValues(values);
    case "screenSizes":
      return [...values].sort((a, b) => Number(a) - Number(b));
    default:
      return [...values].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  }
}

export function matchesFacets(
  product: Product,
  state: Pick<CatalogFilterState, "facets" | "favoritesOnly">,
  ignore?: FacetKey
) {
  if (state.favoritesOnly && !product.isFavorite) {
    return false;
  }

  return FACET_KEYS.every((key) => {
    const selected = state.facets[key];
    return key === ignore || selected.length === 0 || selected.includes(getFacetValue(product, key));
  });
}

// Options construites sur tout l'historique (dispo + expirées) de la catégorie, pour qu'une
// puce disparue du site reste filtrable. Les compteurs ignorent la facette elle-même afin
// qu'on puisse cocher plusieurs valeurs d'un même groupe.
export function buildFacetOptions(args: {
  products: Product[];
  isAvailable: (product: Product) => boolean;
  state: CatalogFilterState;
  colorLabel: (color: string) => string;
}): Array<{ key: FacetKey; options: FacetOption[] }> {
  const inCategory = args.products.filter((product) => product.category === args.state.category);

  return getFacetKeysForCategory(args.state.category).flatMap((key) => {
    const byValue = new Map<string, FacetOption>();

    for (const product of inCategory) {
      const value = getFacetValue(product, key);

      if (!value) {
        continue;
      }

      const option =
        byValue.get(value) ??
        {
          value,
          label: getFacetLabel(product, key, value, args.colorLabel),
          available: 0,
          total: 0,
        };

      if (matchesFacets(product, args.state, key)) {
        option.total += 1;
        if (args.isAvailable(product)) {
          option.available += 1;
        }
      }

      byValue.set(value, option);
    }

    // Les sélections actives restent visibles même si elles sont absentes de la catégorie.
    for (const value of args.state.facets[key]) {
      if (!byValue.has(value)) {
        byValue.set(value, { value, label: value, available: 0, total: 0 });
      }
    }

    if (byValue.size === 0) {
      return [];
    }

    return [{
      key,
      options: sortFacetValues(key, Array.from(byValue.keys())).map((value) => byValue.get(value)!),
    }];
  });
}

export function serializeFilterState(state: CatalogFilterState): string {
  const params = new URLSearchParams();
  params.set("cat", state.category);

  for (const key of FACET_KEYS) {
    if (state.facets[key].length > 0) {
      params.set(URL_PARAM_BY_FACET[key], state.facets[key].join(","));
    }
  }

  if (state.favoritesOnly) params.set("fav", "1");
  if (!state.includeExpired) params.set("expired", "0");
  if (state.sort !== "best-deal") params.set("sort", state.sort);

  return params.toString();
}

export function parseFilterState(search: string): CatalogFilterState {
  const params = new URLSearchParams(search);
  const category = params.get("cat");
  const state = createDefaultFilterState(
    (CATEGORIES as readonly string[]).includes(category ?? "") ? (category as Category) : "mac"
  );

  for (const key of FACET_KEYS) {
    const raw = params.get(URL_PARAM_BY_FACET[key]);
    state.facets[key] = raw ? raw.split(",").filter(Boolean) : [];
  }

  state.favoritesOnly = params.get("fav") === "1";
  state.includeExpired = params.get("expired") !== "0";

  const sort = params.get("sort");
  if (SORT_OPTIONS.some((option) => option.value === sort)) {
    state.sort = sort as SortOption;
  }

  return state;
}
