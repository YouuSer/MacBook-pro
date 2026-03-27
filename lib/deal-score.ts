import type { Product } from "./types";

const CHIP_SCORES: Record<string, number> = {
  "M1 Pro": 20,
  "M2 Pro": 40,
  "M3 Pro": 60,
  "M4 Pro": 85,
  "M5 Pro": 100,
};

const MAX_RAM_GB = 128;
const MAX_STORAGE_GB = 4096;

const WEIGHT_CHIP = 0.55;
const WEIGHT_RAM = 0.35;
const WEIGHT_STORAGE = 0.10;

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

export function computeDealScore(product: Product): number {
  const chipScore = CHIP_SCORES[product.chip] ?? 30;
  const ramGB = parseCapacityGB(product.memory);
  const ramScore = Math.min((ramGB / MAX_RAM_GB) * 100, 100);
  const storageGB = parseCapacityGB(product.storage);
  const storageScore = Math.min((storageGB / MAX_STORAGE_GB) * 100, 100);

  const specScore =
    chipScore * WEIGHT_CHIP +
    ramScore * WEIGHT_RAM +
    storageScore * WEIGHT_STORAGE;

  if (product.currentPrice <= 0) return 0;

  return (specScore / product.currentPrice) * 1000;
}
