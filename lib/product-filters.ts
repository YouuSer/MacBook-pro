import {
  normalizeProductLine,
  normalizeScreenSize,
  type ProductLine,
} from "./product-catalog";

export interface ProductFilterValues {
  productLines: ProductLine[];
  chips: string[];
  memories: string[];
  storages: string[];
  screenSizes: string[];
}

export interface ProductFilterMatchable {
  productLine: ProductLine;
  chip: string;
  memory: string;
  storage: string;
  screenSize: string;
}

export interface ProductFilterOptions {
  productLines: ProductLine[];
  chips: string[];
  memories: string[];
  storages: string[];
  screenSizes: string[];
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function createEmptyProductFilters(): ProductFilterValues {
  return {
    productLines: [],
    chips: [],
    memories: [],
    storages: [],
    screenSizes: [],
  };
}

export function normalizeFilterTextValue(value: string): string {
  return value.trim().toUpperCase();
}

export function toCapacityValue(value: string): number {
  const normalized = normalizeFilterTextValue(value).replace(",", ".");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(TB|GB|GO)/);

  if (match) {
    const amount = parseFloat(match[1]);
    return match[2] === "TB" ? amount * 1024 : amount;
  }

  const fallback = normalized.match(/(\d+(?:\.\d+)?)/);
  return fallback ? parseFloat(fallback[1]) : Number.POSITIVE_INFINITY;
}

export function sortSpecValues(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const aCapacity = toCapacityValue(a);
    const bCapacity = toCapacityValue(b);

    if (
      Number.isFinite(aCapacity) &&
      Number.isFinite(bCapacity) &&
      aCapacity !== bCapacity
    ) {
      return aCapacity - bCapacity;
    }

    return a.localeCompare(b, "fr", { numeric: true });
  });
}

export function getSortableCapacityValue(value: string): number {
  const parsed = toCapacityValue(normalizeFilterTextValue(value));
  return Number.isFinite(parsed) ? parsed : -1;
}

function normalizeTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return unique(
    value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => normalizeFilterTextValue(entry))
      .filter(Boolean)
  );
}

export function normalizeProductFilters(
  value: Partial<ProductFilterValues> | null | undefined
): ProductFilterValues {
  const filters = value ?? {};

  return {
    productLines: unique(
      (Array.isArray(filters.productLines) ? filters.productLines : [])
        .map((entry) => normalizeProductLine(entry))
        .filter((entry): entry is ProductLine => entry !== null)
    ),
    chips: normalizeTextArray(filters.chips),
    memories: normalizeTextArray(filters.memories),
    storages: normalizeTextArray(filters.storages),
    screenSizes: unique(
      (Array.isArray(filters.screenSizes) ? filters.screenSizes : [])
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => normalizeScreenSize(entry))
        .filter(Boolean)
    ),
  };
}

export function matchesProductFilters(
  product: ProductFilterMatchable,
  filters: ProductFilterValues
): boolean {
  if (
    filters.productLines.length > 0 &&
    !filters.productLines.includes(product.productLine)
  ) {
    return false;
  }

  if (
    filters.chips.length > 0 &&
    !filters.chips.includes(normalizeFilterTextValue(product.chip))
  ) {
    return false;
  }

  if (
    filters.memories.length > 0 &&
    !filters.memories.includes(normalizeFilterTextValue(product.memory))
  ) {
    return false;
  }

  if (
    filters.storages.length > 0 &&
    !filters.storages.includes(normalizeFilterTextValue(product.storage))
  ) {
    return false;
  }

  if (
    filters.screenSizes.length > 0 &&
    !filters.screenSizes.includes(normalizeScreenSize(product.screenSize))
  ) {
    return false;
  }

  return true;
}

export function getProductFilterOptions(
  products: ProductFilterMatchable[]
): ProductFilterOptions {
  return {
    productLines: unique(products.map((product) => product.productLine)).sort(),
    chips: unique(
      products
        .map((product) => normalizeFilterTextValue(product.chip))
        .filter(Boolean)
    ).sort((a, b) => a.localeCompare(b, "fr", { numeric: true })),
    memories: sortSpecValues(
      unique(
        products
          .map((product) => normalizeFilterTextValue(product.memory))
          .filter(Boolean)
      )
    ),
    storages: sortSpecValues(
      unique(
        products
          .map((product) => normalizeFilterTextValue(product.storage))
          .filter(Boolean)
      )
    ),
    screenSizes: unique(
      products
        .map((product) => normalizeScreenSize(product.screenSize))
        .filter(Boolean)
    ).sort((a, b) => Number(a) - Number(b)),
  };
}
