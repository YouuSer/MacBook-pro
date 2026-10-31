import { normalizeScreenSize } from "./product-catalog";
import type { Product } from "./types";

export type AppleDeviceProfileId =
  | "air"
  | "desktop"
  | "pro_13_legacy"
  | "pro_14_16_standard"
  | "pro_14_16_pro";

export interface AppleDeviceProfile {
  id: AppleDeviceProfileId;
  activeCoolingScore: number;
  externalDisplaysScore: number;
  portsScore: number;
  longevityScore: number;
}

const APPLE_DEVICE_PROFILES: Record<AppleDeviceProfileId, AppleDeviceProfile> = {
  air: {
    id: "air",
    activeCoolingScore: 0,
    externalDisplaysScore: 25,
    portsScore: 20,
    longevityScore: 40,
  },
  desktop: {
    id: "desktop",
    activeCoolingScore: 100,
    externalDisplaysScore: 70,
    portsScore: 80,
    longevityScore: 75,
  },
  pro_13_legacy: {
    id: "pro_13_legacy",
    activeCoolingScore: 60,
    externalDisplaysScore: 25,
    portsScore: 35,
    longevityScore: 45,
  },
  pro_14_16_standard: {
    id: "pro_14_16_standard",
    activeCoolingScore: 100,
    externalDisplaysScore: 70,
    portsScore: 100,
    longevityScore: 75,
  },
  pro_14_16_pro: {
    id: "pro_14_16_pro",
    activeCoolingScore: 100,
    externalDisplaysScore: 100,
    portsScore: 100,
    longevityScore: 90,
  },
};

export function getAppleDeviceProfile(product: Product): AppleDeviceProfile {
  if (["imac", "macmini", "macstudio", "macpro"].includes(product.productLine)) {
    return APPLE_DEVICE_PROFILES.desktop;
  }

  if (product.productLine !== "macbookpro") {
    return APPLE_DEVICE_PROFILES.air;
  }

  const screenSize = normalizeScreenSize(product.screenSize);

  if (screenSize === "13") {
    return APPLE_DEVICE_PROFILES.pro_13_legacy;
  }

  if (/\bPro$/i.test(product.chip)) {
    return APPLE_DEVICE_PROFILES.pro_14_16_pro;
  }

  return APPLE_DEVICE_PROFILES.pro_14_16_standard;
}
