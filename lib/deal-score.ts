import { getAppleDeviceProfile } from "./apple-device-profiles";
import { getProductLineLabel } from "./product-catalog";
import type { Product } from "./types";

const CHIP_SCORES: Record<string, number> = {
  M1: 35,
  M2: 42,
  M3: 50,
  M4: 62,
  M5: 70,
  "M1 Pro": 72,
  "M2 Pro": 80,
  "M3 Pro": 88,
  "M4 Pro": 94,
  "M5 Pro": 100,
};

const FIT_WEIGHT_RAM = 0.30;
const FIT_WEIGHT_CHIP = 0.25;
const FIT_WEIGHT_STORAGE = 0.15;
const FIT_WEIGHT_COOLING = 0.10;
const FIT_WEIGHT_DISPLAYS = 0.10;
const FIT_WEIGHT_PORTS = 0.05;
const FIT_WEIGHT_LONGEVITY = 0.05;

const DEAL_WEIGHT_DISCOUNT = 0.70;
const DEAL_WEIGHT_PRICE = 0.30;

const GLOBAL_WEIGHT_FIT = 0.75;
const GLOBAL_WEIGHT_DEAL = 0.25;

export interface DealInsights {
  developerFitScore: number;
  dealOpportunityScore: number;
  totalScore: number;
  reasons: string[];
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

function formatCapacityLabel(value: string): string {
  const match = value.trim().match(/(\d+(?:[.,]\d+)?)\s*(TB|GB)/i);
  if (!match) return value.trim();
  return `${match[1].replace(".", ",")} ${match[2].toUpperCase()}`;
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

function getDiscountScore(savingsPercent: number): number {
  return Math.min(Math.max(savingsPercent, 0) / 25, 1) * 100;
}

function getQuantile(values: number[], quantile: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * quantile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function getPriceInLineScore(price: number, peers: Product[]): number {
  const prices = peers
    .map((peer) => peer.currentPrice)
    .filter((candidate) => candidate > 0);

  if (prices.length === 0) {
    return 50;
  }

  const p25 = getQuantile(prices, 0.25);
  const p50 = getQuantile(prices, 0.5);
  const p75 = getQuantile(prices, 0.75);

  if (price <= p25) return 100;
  if (price <= p50) return 70;
  if (price <= p75) return 40;
  return 15;
}

function pushReason(reasons: string[], reason: string) {
  if (reasons.includes(reason) || reasons.length >= 3) {
    return;
  }

  reasons.push(reason);
}

function getReasons(
  product: Product,
  ramGB: number,
  storageGB: number,
  priceInLineScore: number,
  profile = getAppleDeviceProfile(product)
): string[] {
  const reasons: string[] = [];

  if (ramGB >= 32) {
    pushReason(reasons, `${formatCapacityLabel(product.memory)} de RAM`);
  } else if (ramGB >= 16) {
    pushReason(reasons, `${formatCapacityLabel(product.memory)} pour dev`);
  }

  if (/\bPro$/i.test(product.chip)) {
    pushReason(reasons, "puce Pro");
  } else if (/^M[45]$/i.test(product.chip)) {
    pushReason(reasons, `puce ${product.chip} recente`);
  }

  if (storageGB >= 1024) {
    pushReason(reasons, `${formatCapacityLabel(product.storage)} SSD`);
  } else if (storageGB >= 512) {
    pushReason(reasons, "512 Go SSD");
  }

  if (product.savingsPercent >= 20) {
    pushReason(reasons, `${Math.round(product.savingsPercent)}% sous le neuf`);
  } else if (priceInLineScore >= 100) {
    pushReason(reasons, `prix bas pour un ${getProductLineLabel(product.productLine)}`);
  }

  if (profile.externalDisplaysScore >= 100) {
    pushReason(reasons, "multi-ecrans solide");
  } else if (profile.portsScore >= 100) {
    pushReason(reasons, "ports complets");
  }

  if (reasons.length === 0) {
    pushReason(reasons, "bon equilibre pour dev");
  }

  return reasons;
}

export function getDealInsights(product: Product, peers: Product[]): DealInsights {
  const chipScore = CHIP_SCORES[product.chip] ?? 30;
  const ramGB = parseCapacityGB(product.memory);
  const ramScore = getRamScore(ramGB);
  const storageGB = parseCapacityGB(product.storage);
  const storageScore = getStorageScore(storageGB);
  const profile = getAppleDeviceProfile(product);

  const developerFitScore =
    chipScore * FIT_WEIGHT_CHIP +
    ramScore * FIT_WEIGHT_RAM +
    storageScore * FIT_WEIGHT_STORAGE +
    profile.activeCoolingScore * FIT_WEIGHT_COOLING +
    profile.externalDisplaysScore * FIT_WEIGHT_DISPLAYS +
    profile.portsScore * FIT_WEIGHT_PORTS +
    profile.longevityScore * FIT_WEIGHT_LONGEVITY;

  const linePeers = peers.filter((peer) => peer.productLine === product.productLine);
  const discountScore = getDiscountScore(product.savingsPercent);
  const priceInLineScore = getPriceInLineScore(product.currentPrice, linePeers);

  const dealOpportunityScore =
    discountScore * DEAL_WEIGHT_DISCOUNT +
    priceInLineScore * DEAL_WEIGHT_PRICE;

  const totalScore =
    developerFitScore * GLOBAL_WEIGHT_FIT +
    dealOpportunityScore * GLOBAL_WEIGHT_DEAL;

  return {
    developerFitScore,
    dealOpportunityScore,
    totalScore,
    reasons: getReasons(product, ramGB, storageGB, priceInLineScore, profile),
  };
}

export function computeDealScore(product: Product, peers: Product[]): number {
  return getDealInsights(product, peers).totalScore;
}
