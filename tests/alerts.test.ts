import { describe, expect, it } from "vitest";
import {
  buildAlertWebhookRequest,
  getAlertCandidateForScrapedProduct,
  parseAlertRuleInput,
  ruleMatchesAlertCandidate,
  type AlertCandidate,
  type AlertRule,
} from "../lib/alerts";
import { matchesProductFilters, normalizeProductFilters } from "../lib/product-filters";

const baseScrapedProduct = {
  partNumber: "MBP14-M3P-18",
  title: "MacBook Pro 14 pouces M3 Pro",
  currentPrice: 2199,
  productLine: "pro" as const,
  chip: "M3 Pro",
  memory: "18 Go",
  storage: "512 Go",
  screenSize: "14 pouces",
  productUrl: "https://www.apple.com/fr/shop/product/XYZ",
  imageUrl: "https://store.storeimages.cdn-apple.com/example.jpg",
};

const baseRule: AlertRule = {
  id: 1,
  name: "M3 Pro 14",
  enabled: true,
  channelType: "discord",
  webhookUrl: "https://discord.com/api/webhooks/1/abc",
  triggers: ["new_match", "price_drop"],
  filters: normalizeProductFilters({
    productLines: ["pro"],
    chips: ["M3 Pro"],
    memories: ["18 Go"],
    storages: ["512 Go"],
    screenSizes: ["14"],
  }),
  createdAt: "2026-04-10T08:00:00.000Z",
  updatedAt: "2026-04-10T08:00:00.000Z",
};

const baseCandidate: AlertCandidate = {
  eventType: "new_match",
  partNumber: baseScrapedProduct.partNumber,
  title: baseScrapedProduct.title,
  currentPrice: baseScrapedProduct.currentPrice,
  previousPrice: null,
  productLine: baseScrapedProduct.productLine,
  chip: baseScrapedProduct.chip,
  memory: baseScrapedProduct.memory,
  storage: baseScrapedProduct.storage,
  screenSize: baseScrapedProduct.screenSize,
  productUrl: baseScrapedProduct.productUrl,
  imageUrl: baseScrapedProduct.imageUrl,
};

describe("product filter matching", () => {
  it("matches when every configured filter matches the product", () => {
    expect(
      matchesProductFilters(baseCandidate, baseRule.filters)
    ).toBe(true);
  });

  it("rejects when one configured filter differs", () => {
    expect(
      matchesProductFilters(baseCandidate, {
        ...baseRule.filters,
        memories: ["36 GO"],
      })
    ).toBe(false);
  });
});

describe("alert trigger detection", () => {
  it("creates a new_match alert for a never-seen product", () => {
    const candidate = getAlertCandidateForScrapedProduct({
      existingProduct: null,
      scrapedProduct: baseScrapedProduct,
      lastSuccessfulScrapedAt: "2026-04-10T07:00:00.000Z",
    });

    expect(candidate?.eventType).toBe("new_match");
    expect(candidate?.previousPrice).toBeNull();
  });

  it("creates a new_match alert for a reappearing product", () => {
    const candidate = getAlertCandidateForScrapedProduct({
      existingProduct: {
        currentPrice: 2299,
        lastSeen: "2026-04-09T05:00:00.000Z",
      },
      scrapedProduct: baseScrapedProduct,
      lastSuccessfulScrapedAt: "2026-04-10T07:00:00.000Z",
    });

    expect(candidate?.eventType).toBe("new_match");
    expect(candidate?.previousPrice).toBe(2299);
  });

  it("creates a price_drop alert when price decreases on an active listing", () => {
    const candidate = getAlertCandidateForScrapedProduct({
      existingProduct: {
        currentPrice: 2399,
        lastSeen: "2026-04-10T07:30:00.000Z",
      },
      scrapedProduct: baseScrapedProduct,
      lastSuccessfulScrapedAt: "2026-04-10T07:00:00.000Z",
    });

    expect(candidate?.eventType).toBe("price_drop");
    expect(candidate?.previousPrice).toBe(2399);
  });

  it("does not create an alert when price is unchanged", () => {
    const candidate = getAlertCandidateForScrapedProduct({
      existingProduct: {
        currentPrice: 2199,
        lastSeen: "2026-04-10T07:30:00.000Z",
      },
      scrapedProduct: baseScrapedProduct,
      lastSuccessfulScrapedAt: "2026-04-10T07:00:00.000Z",
    });

    expect(candidate).toBeNull();
  });
});

describe("rule matching", () => {
  it("requires both the trigger and filters to match", () => {
    expect(ruleMatchesAlertCandidate(baseRule, baseCandidate)).toBe(true);

    expect(
      ruleMatchesAlertCandidate(
        {
          ...baseRule,
          triggers: ["price_drop"],
        },
        baseCandidate
      )
    ).toBe(false);
  });
});

describe("rule input normalization", () => {
  it("normalizes filter values and preserves triggers", () => {
    const parsed = parseAlertRuleInput({
      name: "Alerte Pro",
      enabled: true,
      channelType: "slack",
      webhookUrl: "https://hooks.slack.com/services/abc",
      triggers: ["new_match", "price_drop"],
      filters: {
        productLines: ["pro"],
        chips: ["m3 pro"],
        memories: ["18 go"],
        storages: ["512 go"],
        screenSizes: ['14"'],
      },
    });

    expect(parsed.channelType).toBe("slack");
    expect(parsed.filters.chips).toEqual(["M3 PRO"]);
    expect(parsed.filters.screenSizes).toEqual(["14"]);
  });
});

describe("webhook payload formatting", () => {
  it("builds a Discord embed payload", () => {
    const request = buildAlertWebhookRequest(baseRule, baseCandidate);
    const payload = JSON.parse(request.body) as {
      content: string;
      embeds: Array<{ title: string; fields: Array<{ name: string; value: string }> }>;
    };

    expect(payload.content).toContain("Nouveau match");
    expect(payload.embeds[0].title).toContain(baseRule.name);
    expect(payload.embeds[0].fields.find((field) => field.name === "Prix actuel")?.value).toBe(
      "2 199 €"
    );
  });

  it("builds a Slack block payload", () => {
    const request = buildAlertWebhookRequest(
      {
        ...baseRule,
        channelType: "slack",
      },
      {
        ...baseCandidate,
        eventType: "price_drop",
        previousPrice: 2399,
      }
    );
    const payload = JSON.parse(request.body) as {
      text: string;
      blocks: Array<{ type: string }>;
    };

    expect(payload.text).toContain("Baisse de prix");
    expect(payload.blocks.some((block) => block.type === "actions")).toBe(true);
  });
});
