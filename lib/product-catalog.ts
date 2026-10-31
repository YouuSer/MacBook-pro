export const CATEGORIES = ["mac", "iphone", "airpods", "appletv", "homepod"] as const;
export type Category = (typeof CATEGORIES)[number];

// Clé de famille Apple (refurbClearModel), ex. "macbookair", "macmini", "iphone16pro".
export type ProductLine = string;

export type FilterKey = "productLines" | "chips" | "memories" | "storages" | "screenSizes" | "colors";

export interface CategoryDefinition {
  id: Category;
  label: string;
  path: string;
  filters: FilterKey[];
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  { id: "mac", label: "Mac", path: "mac", filters: ["productLines", "chips", "memories", "storages", "screenSizes"] },
  { id: "iphone", label: "iPhone", path: "iphone", filters: ["productLines", "storages", "colors"] },
  { id: "airpods", label: "AirPods", path: "airpods", filters: ["productLines", "colors"] },
  { id: "appletv", label: "Apple TV", path: "appletv", filters: ["productLines", "storages"] },
  { id: "homepod", label: "HomePod", path: "homepod", filters: ["productLines", "colors"] },
];

const LEGACY_PRODUCT_LINES: Record<string, ProductLine> = {
  air: "macbookair",
  pro: "macbookpro",
};

const FAMILY_LABELS: Record<string, string> = {
  macbookneo: "MacBook Neo",
  macbookair: "MacBook Air",
  macbookpro: "MacBook Pro",
  imac: "iMac",
  macmini: "Mac mini",
  macstudio: "Mac Studio",
  macpro: "Mac Pro",
  display: "Écrans",
  appletv: "Apple TV HD",
  appletv4k: "Apple TV 4K",
  homepod: "HomePod",
  homepodmini: "HomePod mini",
};

// Ordre d'affichage des familles Mac, calqué sur Apple.
const FAMILY_ORDER = [
  "macbookneo",
  "macbookair",
  "macbookpro",
  "imac",
  "macmini",
  "macstudio",
  "macpro",
  "display",
];

const CHIP_REGEX = /\b([MA]\d{1,2})(?:\s+(Pro|Max|Ultra|Bionic))?\b/i;
const CORE_WORD_REGEX = "c(?:oe|œ)urs?";
const CPU_CORES_REGEX = new RegExp(`\\bCPU\\s+(\\d+)\\s+${CORE_WORD_REGEX}\\b`, "i");
const GPU_CORES_REGEX = new RegExp(`\\bGPU\\s+(\\d+)\\s+${CORE_WORD_REGEX}\\b`, "i");

const SCREEN_SIZE_LABELS: Record<string, string> = {
  "13": '13"',
  "14": '14"',
  "15": '15"',
  "16": '16"',
};

export function normalizeAppleText(value: string): string {
  return value.replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim();
}

export function parseChip(value: string): string | null {
  const normalized = normalizeAppleText(value);
  const match = normalized.match(CHIP_REGEX);

  if (!match) {
    return null;
  }

  const chip = match[1].toUpperCase();
  const tier = match[2];

  if (!tier) {
    return chip;
  }

  return `${chip} ${tier[0].toUpperCase()}${tier.slice(1).toLowerCase()}`;
}

export function parseCoreCounts(value: string): {
  cpuCores: string;
  gpuCores: string;
} {
  const normalized = normalizeAppleText(value);
  const cpuMatch = normalized.match(CPU_CORES_REGEX);
  const gpuMatch = normalized.match(GPU_CORES_REGEX);

  return {
    cpuCores: cpuMatch?.[1] ?? "",
    gpuCores: gpuMatch?.[1] ?? "",
  };
}

export function normalizeProductLine(
  value: string | null | undefined
): ProductLine | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  if (!normalized) {
    return null;
  }

  return LEGACY_PRODUCT_LINES[normalized] ?? normalized;
}

export function getProductLineFromTitle(title: string): ProductLine | null {
  const normalized = normalizeAppleText(title).toLowerCase();

  if (/macbook neo/.test(normalized)) return "macbookneo";
  if (/macbook air/.test(normalized)) return "macbookair";
  if (/macbook pro/.test(normalized)) return "macbookpro";
  if (/\bimac\b/.test(normalized)) return "imac";
  if (/mac mini/.test(normalized)) return "macmini";
  if (/mac studio/.test(normalized)) return "macstudio";
  if (/mac pro/.test(normalized)) return "macpro";
  if (/display|écran/.test(normalized)) return "display";
  if (/homepod mini/.test(normalized)) return "homepodmini";
  if (/homepod/.test(normalized)) return "homepod";
  if (/apple tv 4k/.test(normalized)) return "appletv4k";
  if (/apple tv/.test(normalized)) return "appletv";

  const iphone = normalized.match(/iphone\s+(\d+e?)(?:\s+(pro max|pro|plus|mini))?/);
  if (iphone) return `iphone${iphone[1]}${(iphone[2] ?? "").replace(/\s+/g, "")}`;

  const airpods = normalized.match(/airpods(?:\s+(pro|max))?(?:\s+(\d))?/);
  if (airpods) return `airpods${airpods[1] ?? ""}${airpods[2] ?? ""}`;

  return null;
}

export function resolveProductLine(
  value: string | null | undefined,
  title: string
): ProductLine | null {
  return normalizeProductLine(value) ?? getProductLineFromTitle(title);
}

export function getCategoryForProductLine(productLine: ProductLine): Category {
  if (productLine.startsWith("iphone")) return "iphone";
  if (productLine.startsWith("airpods")) return "airpods";
  if (productLine.startsWith("appletv")) return "appletv";
  if (productLine.startsWith("homepod")) return "homepod";
  return "mac";
}

export function resolveCategory(
  value: string | null | undefined,
  productLine: ProductLine
): Category {
  return (CATEGORIES as readonly string[]).includes(value ?? "")
    ? (value as Category)
    : getCategoryForProductLine(productLine);
}

export function getCategoryDefinition(category: Category): CategoryDefinition {
  return CATEGORY_DEFINITIONS.find((definition) => definition.id === category)!;
}

export function getProductLineLabel(productLine: ProductLine, fallback?: string | null): string {
  if (FAMILY_LABELS[productLine]) {
    return FAMILY_LABELS[productLine];
  }

  if (fallback) {
    return fallback;
  }

  const iphone = productLine.match(/^iphone(\d+e?)(promax|pro|plus|mini)?$/);
  if (iphone) {
    const tier = { promax: " Pro Max", pro: " Pro", plus: " Plus", mini: " mini" }[iphone[2] ?? ""] ?? "";
    return `iPhone ${iphone[1]}${tier}`;
  }

  const airpods = productLine.match(/^airpods(pro|max)?(\d{1,2})?/);
  if (airpods) {
    return ["AirPods", airpods[1] === "pro" ? "Pro" : airpods[1] === "max" ? "Max" : "", airpods[2] ?? ""]
      .filter(Boolean)
      .join(" ");
  }

  return productLine;
}

export function compareProductLines(a: ProductLine, b: ProductLine): number {
  const aIndex = FAMILY_ORDER.indexOf(a);
  const bIndex = FAMILY_ORDER.indexOf(b);

  if (aIndex !== -1 || bIndex !== -1) {
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  }

  return getProductLineLabel(a).localeCompare(getProductLineLabel(b), "fr", { numeric: true });
}

export function normalizeScreenSize(value: string): string {
  const match = normalizeAppleText(value).match(/\d+/);
  return match ? match[0] : "";
}

export function formatScreenSize(value: string): string | null {
  const normalized = normalizeScreenSize(value);

  if (!normalized) {
    return null;
  }

  return SCREEN_SIZE_LABELS[normalized] ?? `${normalized}"`;
}
