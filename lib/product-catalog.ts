export type ProductLine = "air" | "pro";

const CHIP_REGEX = /\b(M[1-5])(?:\s+(Pro|Max|Ultra))?\b/i;
const STANDARD_CHIP_REGEX = /^M[1-5]$/;
const PRO_CHIP_REGEX = /^M[1-5] Pro$/;
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

  const normalized = value.trim().toLowerCase();

  if (normalized === "air" || normalized === "pro") {
    return normalized;
  }

  return null;
}

export function getProductLineFromTitle(title: string): ProductLine | null {
  const normalized = normalizeAppleText(title);

  if (/macbook air/i.test(normalized)) {
    return "air";
  }

  if (/macbook pro/i.test(normalized)) {
    return "pro";
  }

  return null;
}

export function resolveProductLine(
  value: string | null | undefined,
  title: string
): ProductLine | null {
  return normalizeProductLine(value) ?? getProductLineFromTitle(title);
}

export function getProductLineLabel(productLine: ProductLine): string {
  return productLine === "air" ? "Air" : "Pro";
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

export function isTrackedMacbookTitle(title: string): boolean {
  const productLine = getProductLineFromTitle(title);
  const chip = parseChip(title);

  if (!productLine || !chip) {
    return false;
  }

  if (productLine === "air") {
    return STANDARD_CHIP_REGEX.test(chip);
  }

  return STANDARD_CHIP_REGEX.test(chip) || PRO_CHIP_REGEX.test(chip);
}
