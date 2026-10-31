import { getAppleDeviceProfile } from "./apple-device-profiles";
import { buildFavoriteConfigKey } from "./favorites";
import { normalizeScreenSize } from "./product-catalog";
import { normalizeFilterTextValue } from "./product-filters";
import type { Product } from "./types";

// Score « meilleure affaire » : qualité du prix, quelle que soit la puissance de la machine.
// La remise Apple est quasi forfaitaire sur le reconditionné, elle ne pèse donc qu'en appoint ;
// le signal principal est l'historique de prix de la même configuration.
const DEAL_WEIGHT_HISTORY = 0.45;
const DEAL_WEIGHT_EQUIVALENTS = 0.25;
const DEAL_WEIGHT_RARITY = 0.15;
const DEAL_WEIGHT_DISCOUNT = 0.15;

// Profil dev : adéquation de la machine à un usage de développement (Mac uniquement).
const FIT_WEIGHT_RAM = 0.30;
const FIT_WEIGHT_CHIP = 0.25;
const FIT_WEIGHT_STORAGE = 0.15;
const FIT_WEIGHT_COOLING = 0.10;
const FIT_WEIGHT_DISPLAYS = 0.10;
const FIT_WEIGHT_PORTS = 0.05;
const FIT_WEIGHT_LONGEVITY = 0.05;

// En dessous de ce score, la meilleure offre d'une famille n'est pas mise en avant.
export const NOTABLE_DEAL_SCORE = 55;

const NEUTRAL_SCORE = 50;
const PRICE_EPSILON = 0.5;

export interface DealInsights {
  dealScore: number;
  devFitScore: number | null;
  reasons: string[];
  configLowestPrice: number | null;
  configMedianPrice: number | null;
}

export interface DealContext {
  pricesByConfig: Map<string, number[]>;
  appearancesByConfig: Map<string, number>;
  availableByEquivalent: Map<string, Product[]>;
}

function parseCapacityGB(value: string): number {
  const normalized = value.trim().toUpperCase().replace(",", ".");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(TB|GB)/);
  if (match) {
    const amount = parseFloat(match[1]);
    return match[2] === "TB" ? amount * 1024 : amount;
  }
  const fallback = normalized.match(/(\d+(?:\.\d+)?)/);
  return fallback ? parseFloat(fallback[1]) : 0;
}

function formatEuros(value: number) {
  return `${Math.round(value).toLocaleString("fr-FR")} €`;
}

function getMedian(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function pushReason(reasons: string[], reason: string) {
  if (!reasons.includes(reason) && reasons.length < 3) {
    reasons.push(reason);
  }
}

export function getConfigKey(product: Product) {
  return buildFavoriteConfigKey(product);
}

// Configs équivalentes : même famille, puce, RAM, SSD et taille d'écran (couleur ignorée).
export function getEquivalentKey(product: Product) {
  return [
    product.productLine,
    normalizeFilterTextValue(product.chip),
    normalizeFilterTextValue(product.memory),
    normalizeFilterTextValue(product.storage),
    normalizeScreenSize(product.screenSize),
  ].join("|");
}

export function buildDealContext(available: Product[], all: Product[]): DealContext {
  const pricesByConfig = new Map<string, number[]>();
  const appearancesByConfig = new Map<string, number>();
  const availableByEquivalent = new Map<string, Product[]>();

  for (const product of all) {
    const key = getConfigKey(product);
    const prices = product.priceSeries.length > 0 ? product.priceSeries : [product.currentPrice];
    pricesByConfig.set(key, [...(pricesByConfig.get(key) ?? []), ...prices]);
    appearancesByConfig.set(key, (appearancesByConfig.get(key) ?? 0) + product.appearanceCount);
  }

  for (const product of available) {
    const key = getEquivalentKey(product);
    availableByEquivalent.set(key, [...(availableByEquivalent.get(key) ?? []), product]);
  }

  return { pricesByConfig, appearancesByConfig, availableByEquivalent };
}

// Position du prix actuel entre le plus haut et le plus bas déjà vus pour cette config.
function getHistoryScore(price: number, history: number[]) {
  const min = Math.min(...history);
  const max = Math.max(...history);

  if (history.length < 2 || max - min < PRICE_EPSILON) {
    return NEUTRAL_SCORE;
  }

  return Math.min(Math.max(((max - price) / (max - min)) * 100, 0), 100);
}

function getEquivalentsScore(product: Product, equivalents: Product[]) {
  if (equivalents.length < 2) {
    return NEUTRAL_SCORE;
  }

  const prices = equivalents.map((peer) => peer.currentPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (max - min < PRICE_EPSILON) {
    return NEUTRAL_SCORE;
  }

  return ((max - product.currentPrice) / (max - min)) * 100;
}

function getRarityScore(appearances: number) {
  if (appearances <= 1) return 100;
  if (appearances <= 3) return 70;
  if (appearances <= 6) return 40;
  return 15;
}

function getDiscountScore(savingsPercent: number): number {
  return Math.min(Math.max(savingsPercent, 0) / 25, 1) * 100;
}

// Score de puce générique : génération, puis gamme (Pro, Max, Ultra). Série A en entrée de gamme.
export function getChipScore(chip: string): number {
  const match = chip.trim().match(/^([MA])(\d+)(?:\s+(Pro|Max|Ultra))?$/i);

  if (!match || match[1].toUpperCase() === "A") {
    return 30;
  }

  const tierBonus = { pro: 25, max: 32, ultra: 38 }[(match[3] ?? "").toLowerCase()] ?? 0;
  return Math.min(30 + Number(match[2]) * 8 + tierBonus, 100);
}

function getRamScore(ramGB: number): number {
  if (ramGB >= 64) return 100;
  if (ramGB >= 48) return 95;
  if (ramGB >= 36) return 88;
  if (ramGB >= 32) return 80;
  if (ramGB >= 24) return 65;
  if (ramGB >= 16) return 45;
  if (ramGB >= 8) return 5;
  return 0;
}

function getStorageScore(storageGB: number): number {
  if (storageGB >= 4096) return 100;
  if (storageGB >= 2048) return 95;
  if (storageGB >= 1024) return 85;
  if (storageGB >= 512) return 60;
  if (storageGB >= 256) return 20;
  return 0;
}

export function getDevFitScore(product: Product): number | null {
  if (product.category !== "mac" || product.productLine === "display") {
    return null;
  }

  const profile = getAppleDeviceProfile(product);

  return (
    getChipScore(product.chip) * FIT_WEIGHT_CHIP +
    getRamScore(parseCapacityGB(product.memory)) * FIT_WEIGHT_RAM +
    getStorageScore(parseCapacityGB(product.storage)) * FIT_WEIGHT_STORAGE +
    profile.activeCoolingScore * FIT_WEIGHT_COOLING +
    profile.externalDisplaysScore * FIT_WEIGHT_DISPLAYS +
    profile.portsScore * FIT_WEIGHT_PORTS +
    profile.longevityScore * FIT_WEIGHT_LONGEVITY
  );
}

export function getDealInsights(product: Product, context: DealContext): DealInsights {
  const configKey = getConfigKey(product);
  const history = context.pricesByConfig.get(configKey) ?? [product.currentPrice];
  const appearances = context.appearancesByConfig.get(configKey) ?? product.appearanceCount;
  const equivalents = context.availableByEquivalent.get(getEquivalentKey(product)) ?? [product];
  const lowest = Math.min(...history);
  const median = getMedian(history);
  const hasHistory = history.length >= 2 && Math.max(...history) - lowest >= PRICE_EPSILON;

  const dealScore =
    getHistoryScore(product.currentPrice, history) * DEAL_WEIGHT_HISTORY +
    getEquivalentsScore(product, equivalents) * DEAL_WEIGHT_EQUIVALENTS +
    getRarityScore(appearances) * DEAL_WEIGHT_RARITY +
    getDiscountScore(product.savingsPercent) * DEAL_WEIGHT_DISCOUNT;

  const reasons: string[] = [];

  if (hasHistory && product.currentPrice <= lowest + PRICE_EPSILON) {
    pushReason(reasons, "plus bas prix vu pour cette config");
  } else if (hasHistory && median - product.currentPrice >= 20) {
    pushReason(reasons, `${formatEuros(median - product.currentPrice)} sous son prix habituel`);
  }

  const pricierPeers = equivalents.filter(
    (peer) => peer.currentPrice > product.currentPrice + PRICE_EPSILON
  ).length;
  if (equivalents.length >= 2 && pricierPeers === equivalents.length - 1) {
    pushReason(reasons, `la moins chère des ${equivalents.length} configs équivalentes`);
  }

  if (appearances <= 1) {
    pushReason(reasons, "config rare : première apparition");
  } else if (appearances <= 3) {
    pushReason(reasons, `config rare : vue ${appearances} fois`);
  }

  if (product.savingsPercent >= 1) {
    pushReason(reasons, `−${Math.round(product.savingsPercent)} % vs neuf`);
  }

  return {
    dealScore,
    devFitScore: getDevFitScore(product),
    reasons,
    configLowestPrice: hasHistory ? lowest : null,
    configMedianPrice: hasHistory ? median : null,
  };
}
