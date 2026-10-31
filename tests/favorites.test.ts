import { describe, expect, it } from "vitest";
import {
  buildFavoriteConfigKey,
  getFavoriteEventCandidate,
  type FavoriteProductMatch,
} from "../lib/favorites";

const baseProduct = {
  title:
    "MacBook Pro 14 pouces reconditionné avec puce Apple M5, CPU 10 cœurs, GPU 10 cœurs - Noir sidéral",
  partNumber: "FDE04F/A",
  productLine: "pro" as const,
  chip: "M5",
  screenSize: "14inch",
  memory: "16gb",
  storage: "512gb",
  color: "spaceblack",
  releaseYear: "2025",
};

const baseMatch: FavoriteProductMatch = {
  ...baseProduct,
  currentPrice: 1519,
  lastSeen: "2026-04-11T15:46:48.728Z",
  productUrl: "https://www.apple.com/fr/shop/product/ABC",
  imageUrl: "https://store.storeimages.cdn-apple.com/example.jpg",
};

describe("favorite config normalization", () => {
  it("keeps the same key for the same config with a different SKU", () => {
    expect(
      buildFavoriteConfigKey(baseProduct)
    ).toBe(
      buildFavoriteConfigKey({
        ...baseProduct,
        partNumber: "ZZZ99F/A",
      })
    );
  });

  it("changes the key when RAM differs", () => {
    expect(
      buildFavoriteConfigKey(baseProduct)
    ).not.toBe(
      buildFavoriteConfigKey({
        ...baseProduct,
        memory: "24gb",
      })
    );
  });

  it("changes the key when storage differs", () => {
    expect(
      buildFavoriteConfigKey(baseProduct)
    ).not.toBe(
      buildFavoriteConfigKey({
        ...baseProduct,
        storage: "1tb",
      })
    );
  });

  it("changes the key when color differs", () => {
    expect(
      buildFavoriteConfigKey(baseProduct)
    ).not.toBe(
      buildFavoriteConfigKey({
        ...baseProduct,
        color: "silver",
        title:
          "MacBook Pro 14 pouces reconditionné avec puce Apple M5, CPU 10 cœurs, GPU 10 cœurs - Argent",
      })
    );
  });

  it("changes the key when nano-texture differs", () => {
    expect(
      buildFavoriteConfigKey(baseProduct)
    ).not.toBe(
      buildFavoriteConfigKey({
        ...baseProduct,
        title:
          "MacBook Pro 14 pouces reconditionné avec puce Apple M5, CPU 10 cœurs, GPU 10 cœurs et écran nano-texturé - Noir sidéral",
      })
    );
  });
});

describe("favorite event detection", () => {
  it("emits a reappearance when an unavailable favorite matches again", () => {
    const transition = getFavoriteEventCandidate({
      favoriteId: 1,
      previous: {
        currentState: "unavailable",
        bestCurrentPrice: 1599,
        sourcePartNumber: baseMatch.partNumber,
        label: baseMatch.title,
      },
      matches: [baseMatch],
    });

    expect(transition.event?.eventType).toBe("reappearance");
    expect(transition.event?.previousPrice).toBe(1599);
  });

  it("emits an expiration when an available favorite no longer matches", () => {
    const transition = getFavoriteEventCandidate({
      favoriteId: 1,
      previous: {
        currentState: "available",
        bestCurrentPrice: 1519,
        sourcePartNumber: baseMatch.partNumber,
        label: baseMatch.title,
      },
      matches: [],
    });

    expect(transition.event?.eventType).toBe("expiration");
    expect(transition.event?.currentPrice).toBeNull();
  });

  it("emits a price_drop when the best current price decreases", () => {
    const transition = getFavoriteEventCandidate({
      favoriteId: 1,
      previous: {
        currentState: "available",
        bestCurrentPrice: 1599,
        sourcePartNumber: baseMatch.partNumber,
        label: baseMatch.title,
      },
      matches: [{ ...baseMatch, currentPrice: 1499 }],
    });

    expect(transition.event?.eventType).toBe("price_drop");
    expect(transition.event?.previousPrice).toBe(1599);
    expect(transition.event?.currentPrice).toBe(1499);
  });

  it("does not emit an event when the best price is unchanged", () => {
    const transition = getFavoriteEventCandidate({
      favoriteId: 1,
      previous: {
        currentState: "available",
        bestCurrentPrice: 1519,
        sourcePartNumber: baseMatch.partNumber,
        label: baseMatch.title,
      },
      matches: [baseMatch],
    });

    expect(transition.event).toBeNull();
  });

  it("does not emit price_drop on the same run as a reappearance", () => {
    const transition = getFavoriteEventCandidate({
      favoriteId: 1,
      previous: {
        currentState: "unavailable",
        bestCurrentPrice: 1799,
        sourcePartNumber: baseMatch.partNumber,
        label: baseMatch.title,
      },
      matches: [{ ...baseMatch, currentPrice: 1499 }],
    });

    expect(transition.event?.eventType).toBe("reappearance");
    expect(transition.event?.currentPrice).toBe(1499);
  });
});
