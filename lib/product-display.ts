import { formatScreenSize } from "./product-catalog";
import type { Product } from "./types";

const COLOR_MAP: Record<string, { hex: string; label: string }> = {
  spacegray: { hex: "#7d7e80", label: "Gris sidéral" },
  spaceblack: { hex: "#393b3d", label: "Noir sidéral" },
  silver: { hex: "#c0c1c4", label: "Argent" },
  starlight: { hex: "#f3e7cf", label: "Lumière stellaire" },
  midnight: { hex: "#1f2937", label: "Minuit" },
  midnightblue: { hex: "#1f2937", label: "Minuit" },
  skyblue: { hex: "#c9e3f3", label: "Bleu ciel" },
  black: { hex: "#2b2b2d", label: "Noir" },
  white: { hex: "#f5f5f0", label: "Blanc" },
  pink: { hex: "#f4c6d4", label: "Rose" },
  teal: { hex: "#a8d5cf", label: "Bleu-vert" },
  ultramarine: { hex: "#5b6ee1", label: "Outremer" },
  blacktitanium: { hex: "#3c3c3d", label: "Titane noir" },
  whitetitanium: { hex: "#f0eeea", label: "Titane blanc" },
  naturaltitanium: { hex: "#bfb8ad", label: "Titane naturel" },
  deserttitanium: { hex: "#c7a98a", label: "Titane sable" },
  indigo: { hex: "#4b4f8a", label: "Indigo" },
  blush: { hex: "#f2d3cc", label: "Rose poudré" },
  blue: { hex: "#9fb8d6", label: "Bleu" },
  green: { hex: "#b9d3b0", label: "Vert" },
  yellow: { hex: "#f2e3a0", label: "Jaune" },
  purple: { hex: "#c8b8e0", label: "Mauve" },
  orange: { hex: "#f0b48a", label: "Orange" },
  citrus: { hex: "#e8e08a", label: "Citron" },
};

function colorKey(color: string) {
  return color.trim().toLowerCase().replace(/[^a-z]/g, "");
}

export function getColorLabel(color: string) {
  return COLOR_MAP[colorKey(color)]?.label ?? color;
}

export function getColorHex(color: string) {
  return COLOR_MAP[colorKey(color)]?.hex ?? null;
}

export function formatCapacity(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/(\d)\s*GB$/, "$1 Go")
    .replace(/(\d)\s*TB$/, "$1 To");
}

// Titre court façon Apple Store : « MacBook Pro 14" M4 Pro », « iPhone 16 Pro ».
export function getShortTitle(product: Product) {
  const screen = product.category === "mac" ? formatScreenSize(product.screenSize) : null;
  return [product.productLineLabel, screen, product.chip].filter(Boolean).join(" ");
}

// Ligne de specs : « CPU 12 · GPU 16 · 24 Go · 512 Go · Noir sidéral ».
export function getSpecLine(product: Product) {
  return [
    product.cpuCores ? `CPU ${product.cpuCores}` : null,
    product.gpuCores ? `GPU ${product.gpuCores}` : null,
    product.memory ? formatCapacity(product.memory) : null,
    product.storage ? formatCapacity(product.storage) : null,
    product.color ? getColorLabel(product.color) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function formatPrice(value: number) {
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
}

export function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  });
}

export type ProductStatus =
  | { kind: "expired"; label: string }
  | { kind: "new"; label: string }
  | { kind: "drop"; label: string }
  | { kind: "rise"; label: string }
  | null;

export function getProductStatus(product: Product, isExpired: boolean): ProductStatus {
  if (isExpired) return { kind: "expired", label: "Expirée" };
  if (product.priceTrend === "down") return { kind: "drop", label: "Baisse de prix" };
  if (product.isNew) return { kind: "new", label: "Nouveau" };
  if (product.priceTrend === "up") return { kind: "rise", label: "Hausse de prix" };
  return null;
}

// Pied de carte : contexte temporel le plus utile selon l'état de l'offre.
export function getProductFootnote(product: Product, isExpired: boolean) {
  if (isExpired) {
    return product.appearanceCount > 1
      ? `Vu ${product.appearanceCount} fois · dernière le ${formatShortDate(product.appearanceLastSeen)}`
      : `Vu pour la dernière fois le ${formatShortDate(product.appearanceLastSeen)}`;
  }

  if (product.priceTrend === "down" && product.previousPrice !== null) {
    return `−${formatPrice(product.previousPrice - product.currentPrice)} depuis le dernier prix`;
  }

  if (product.appearanceCount > 1) {
    return `Vu ${product.appearanceCount} fois · depuis le ${formatShortDate(product.appearanceFirstSeen)}`;
  }

  return `Apparu le ${formatShortDate(product.appearanceFirstSeen)}`;
}
