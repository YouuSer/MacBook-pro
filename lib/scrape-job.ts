import { getDb } from "./db";
import {
  alertDeliveries,
  alertRules,
  favoriteConfigs,
  favoriteEvents,
  favoriteNotificationSettings,
  priceHistory,
  products,
  scrapeRuns,
} from "./schema";
import { scrapeAppleRefurb } from "./scraper";
import { desc, eq } from "drizzle-orm";
import {
  buildAlertWebhookRequest,
  getAlertCandidateForScrapedProduct,
  parseAlertRuleRow,
  ruleMatchesAlertCandidate,
  type AlertCandidate,
  type AlertRule,
  type AlertRuleRow,
} from "./alerts";
import {
  buildFavoriteWebhookRequest,
  getFavoriteEventCandidate,
  matchesFavoriteConfig,
  parseFavoriteNotificationSettingsRow,
  type FavoriteEventCandidate,
  type FavoriteState,
  toFavoriteProductMatch,
} from "./favorites";
import type { ScrapedProduct } from "./scraper";
import { resolveCategory, resolveProductLine } from "./product-catalog";

async function loadActiveAlertRules() {
  const db = getDb();
  const rows = await db
    .select()
    .from(alertRules)
    .where(eq(alertRules.enabled, true))
    .orderBy(desc(alertRules.updatedAt));

  return rows
    .map((row) => parseAlertRuleRow(row as AlertRuleRow))
    .filter((rule) => rule.enabled);
}

async function storeAlertDelivery(args: {
  rule: AlertRule;
  candidate: AlertCandidate;
  status: "success" | "error";
  errorMessage: string | null;
  now: string;
}) {
  const db = getDb();
  await db.insert(alertDeliveries).values({
    ruleId: args.rule.id,
    partNumber: args.candidate.partNumber,
    productTitle: args.candidate.title,
    eventType: args.candidate.eventType,
    currentPrice: args.candidate.currentPrice,
    previousPrice: args.candidate.previousPrice,
    status: args.status,
    errorMessage: args.errorMessage,
    scrapedAt: args.now,
    createdAt: args.now,
  });
}

async function deliverAlert(rule: AlertRule, candidate: AlertCandidate, now: string) {
  let status: "success" | "error" = "success";
  let errorMessage: string | null = null;

  try {
    const request = buildAlertWebhookRequest(rule, candidate);
    const response = await fetch(rule.webhookUrl, {
      method: "POST",
      headers: request.headers,
      body: request.body,
    });

    if (!response.ok) {
      status = "error";
      errorMessage = `Webhook returned ${response.status}`;
    }
  } catch (error) {
    status = "error";
    errorMessage = error instanceof Error ? error.message : "Unknown webhook error";
  }

  try {
    await storeAlertDelivery({
      rule,
      candidate,
      status,
      errorMessage,
      now,
    });
  } catch (error) {
    console.error("Failed to store alert delivery", error);
  }
}

async function deliverAlertNotifications(candidates: AlertCandidate[], now: string) {
  if (candidates.length === 0) {
    return;
  }

  const rules = await loadActiveAlertRules();

  if (rules.length === 0) {
    return;
  }

  const deliveries = candidates.flatMap((candidate) =>
    rules
      .filter((rule) => ruleMatchesAlertCandidate(rule, candidate))
      .map((rule) => deliverAlert(rule, candidate, now))
  );

  if (deliveries.length === 0) {
    return;
  }

  await Promise.allSettled(deliveries);
}

async function loadFavoriteNotificationSettings() {
  const db = getDb();
  const rows = await db
    .select()
    .from(favoriteNotificationSettings)
    .orderBy(desc(favoriteNotificationSettings.updatedAt))
    .limit(1);

  return parseFavoriteNotificationSettingsRow(rows[0]);
}

async function storeFavoriteEvent(args: {
  candidate: FavoriteEventCandidate;
  deliveryStatus: "success" | "error" | null;
  deliveryError: string | null;
  deliveredAt: string | null;
  now: string;
}) {
  const db = getDb();

  await db.insert(favoriteEvents).values({
    favoriteId: args.candidate.favoriteId,
    eventType: args.candidate.eventType,
    partNumber: args.candidate.partNumber,
    productTitle: args.candidate.productTitle,
    currentPrice: args.candidate.currentPrice,
    previousPrice: args.candidate.previousPrice,
    deliveryStatus: args.deliveryStatus,
    deliveryError: args.deliveryError,
    deliveredAt: args.deliveredAt,
    createdAt: args.now,
  });
}

async function deliverFavoriteEvent(args: {
  candidate: FavoriteEventCandidate;
  favoriteLabel: string;
  settings: Awaited<ReturnType<typeof loadFavoriteNotificationSettings>>;
  now: string;
}) {
  let deliveryStatus: "success" | "error" | null = null;
  let deliveryError: string | null = null;
  let deliveredAt: string | null = null;
  const shouldDeliver =
    args.settings.enabled &&
    Boolean(args.settings.webhookUrl) &&
    args.settings.triggers.includes(args.candidate.eventType);

  if (shouldDeliver) {
    try {
      const request = buildFavoriteWebhookRequest(
        args.settings,
        args.favoriteLabel,
        args.candidate
      );
      const response = await fetch(args.settings.webhookUrl, {
        method: "POST",
        headers: request.headers,
        body: request.body,
      });

      if (!response.ok) {
        deliveryStatus = "error";
        deliveryError = `Webhook returned ${response.status}`;
      } else {
        deliveryStatus = "success";
        deliveredAt = args.now;
      }
    } catch (error) {
      deliveryStatus = "error";
      deliveryError =
        error instanceof Error ? error.message : "Unknown webhook error";
    }
  }

  try {
    await storeFavoriteEvent({
      candidate: args.candidate,
      deliveryStatus,
      deliveryError,
      deliveredAt,
      now: args.now,
    });
  } catch (error) {
    console.error("Failed to store favorite event", error);
  }
}

async function syncFavoriteConfigsAfterScrape(now: string) {
  const db = getDb();
  const [favoriteRows, productRows, settings] = await Promise.all([
    db.select().from(favoriteConfigs),
    db
      .select({
        partNumber: products.partNumber,
        title: products.title,
        currentPrice: products.currentPrice,
        productLine: products.productLine,
        chip: products.chip,
        screenSize: products.screenSize,
        memory: products.memory,
        storage: products.storage,
        color: products.color,
        releaseYear: products.releaseYear,
        productUrl: products.productUrl,
        imageUrl: products.imageUrl,
        lastSeen: products.lastSeen,
      })
      .from(products),
    loadFavoriteNotificationSettings(),
  ]);

  if (favoriteRows.length === 0) {
    return;
  }

  const trackedProducts = productRows
    .map((product) => toFavoriteProductMatch(product))
    .filter(
      (product): product is NonNullable<ReturnType<typeof toFavoriteProductMatch>> =>
        product !== null
    );
  const currentProducts = trackedProducts.filter((product) => product.lastSeen === now);
  const pendingEvents: Array<{
    candidate: FavoriteEventCandidate;
    favoriteLabel: string;
  }> = [];

  for (const favorite of favoriteRows) {
    const matches = currentProducts.filter((product) =>
      matchesFavoriteConfig(product, favorite.configKey)
    );
    const previousState: FavoriteState =
      favorite.currentState === "available" ? "available" : "unavailable";
    const transition = getFavoriteEventCandidate({
      favoriteId: favorite.id,
      previous: {
        currentState: previousState,
        bestCurrentPrice: favorite.bestCurrentPrice,
        sourcePartNumber: favorite.sourcePartNumber,
        label: favorite.label,
      },
      matches,
    });

    await db
      .update(favoriteConfigs)
      .set({
        currentState: transition.nextState,
        bestCurrentPrice: transition.nextBestPrice,
        lastMatchedAt: transition.lastMatchedAt ?? favorite.lastMatchedAt,
        lastEventAt: transition.event ? now : favorite.lastEventAt,
        updatedAt: now,
      })
      .where(eq(favoriteConfigs.id, favorite.id));

    if (transition.event) {
      pendingEvents.push({
        candidate: transition.event,
        favoriteLabel: favorite.label,
      });
    }
  }

  if (pendingEvents.length === 0) {
    return;
  }

  await Promise.allSettled(
    pendingEvents.map((event) =>
      deliverFavoriteEvent({
        candidate: event.candidate,
        favoriteLabel: event.favoriteLabel,
        settings,
        now,
      })
    )
  );
}

function toAlertCandidate(product: ScrapedProduct, existingProduct: {
  currentPrice: number;
  lastSeen: string;
} | undefined, lastSuccessfulScrapedAt: string | null) {
  return getAlertCandidateForScrapedProduct({
    existingProduct,
    lastSuccessfulScrapedAt,
    scrapedProduct: {
      partNumber: product.partNumber,
      title: product.title,
      currentPrice: product.currentPrice,
      productLine: product.productLine,
      chip: product.chip,
      memory: product.memory,
      storage: product.storage,
      screenSize: product.screenSize,
      productUrl: product.productUrl,
      imageUrl: product.imageUrl,
    },
  });
}

export async function runScrapeJob() {
  const db = getDb();
  const now = new Date().toISOString();
  const alertCandidates: AlertCandidate[] = [];

  const { products: scraped, totalFound, failedCategories } = await scrapeAppleRefurb();

  // Get existing products to detect new ones
  const existing = await db.select().from(products);
  const existingMap = new Map(existing.map((p) => [p.partNumber, p]));
  // Premier scrape d'une catégorie : tout son catalogue serait « nouveau ». On enregistre
  // les offres sans envoyer d'alertes new_match pour éviter d'inonder les webhooks.
  const knownCategories = new Set(
    existing.map((row) =>
      resolveCategory(row.category, resolveProductLine(row.productLine, row.title) ?? "")
    )
  );

  // On se base sur le dernier run reussi uniquement.
  // Un run en erreur ou un run concurrent ne doit pas créer une "réapparition" artificielle.
  const lastSuccessfulRun = await db
    .select({ scrapedAt: scrapeRuns.scrapedAt })
    .from(scrapeRuns)
    .where(eq(scrapeRuns.status, "success"))
    .orderBy(desc(scrapeRuns.scrapedAt))
    .limit(1);
  const lastSuccessfulScrapedAt = lastSuccessfulRun[0]?.scrapedAt ?? null;

  let newCount = 0;

  for (const p of scraped) {
    const exists = existingMap.get(p.partNumber);
    const alertCandidate = toAlertCandidate(p, exists, lastSuccessfulScrapedAt);
    const isReappearing =
      alertCandidate?.eventType === "new_match" && Boolean(exists);

    if (
      alertCandidate &&
      (alertCandidate.eventType !== "new_match" || knownCategories.has(p.category))
    ) {
      alertCandidates.push(alertCandidate);
    }

    if (exists) {
      await db
        .update(products)
        .set({
          title: p.title,
          currentPrice: p.currentPrice,
          originalPrice: p.originalPrice,
          savingsPercent: p.savingsPercent,
          savings: p.savings,
          category: p.category,
          productLine: p.productLine,
          productLineLabel: p.productLineLabel || null,
          chip: p.chip,
          screenSize: p.screenSize,
          memory: p.memory,
          storage: p.storage,
          color: p.color,
          releaseYear: p.releaseYear,
          productUrl: p.productUrl,
          imageUrl: p.imageUrl,
          lastSeen: now,
          ...(isReappearing ? { firstSeen: now } : {}),
        })
        .where(eq(products.partNumber, p.partNumber));
    } else {
      await db.insert(products).values({
        partNumber: p.partNumber,
        title: p.title,
        currentPrice: p.currentPrice,
        originalPrice: p.originalPrice,
        savingsPercent: p.savingsPercent,
        savings: p.savings,
        category: p.category,
        productLine: p.productLine,
        productLineLabel: p.productLineLabel || null,
        chip: p.chip,
        screenSize: p.screenSize,
        memory: p.memory,
        storage: p.storage,
        color: p.color,
        releaseYear: p.releaseYear,
        productUrl: p.productUrl,
        imageUrl: p.imageUrl,
        firstSeen: now,
        lastSeen: now,
      });
      newCount++;
    }

    // Consolidate price history: update lastSeenAt if price unchanged, otherwise insert new row
    // Si réapparition après expiration, toujours créer une nouvelle ligne (date de fin figée)
    const lastEntry = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.partNumber, p.partNumber))
      .orderBy(desc(priceHistory.lastSeenAt))
      .limit(1);

    if (!isReappearing && lastEntry.length > 0 && lastEntry[0].price === p.currentPrice) {
      await db
        .update(priceHistory)
        .set({ lastSeenAt: now })
        .where(eq(priceHistory.id, lastEntry[0].id));
    } else {
      await db.insert(priceHistory).values({
        partNumber: p.partNumber,
        price: p.currentPrice,
        firstSeenAt: now,
        lastSeenAt: now,
      });
    }
  }

  // Une catégorie en échec ne doit pas faire expirer ses offres : on prolonge
  // celles qui étaient disponibles au run précédent.
  if (failedCategories.length > 0 && lastSuccessfulScrapedAt) {
    const failed = new Set<string>(failedCategories.map((f) => f.category));
    const stillAvailable = existing.filter(
      (row) =>
        row.lastSeen === lastSuccessfulScrapedAt &&
        failed.has(resolveCategory(row.category, resolveProductLine(row.productLine, row.title) ?? ""))
    );

    for (const row of stillAvailable) {
      await db.update(products).set({ lastSeen: now }).where(eq(products.partNumber, row.partNumber));

      const [lastEntry] = await db
        .select({ id: priceHistory.id })
        .from(priceHistory)
        .where(eq(priceHistory.partNumber, row.partNumber))
        .orderBy(desc(priceHistory.lastSeenAt))
        .limit(1);

      if (lastEntry) {
        await db.update(priceHistory).set({ lastSeenAt: now }).where(eq(priceHistory.id, lastEntry.id));
      }
    }
  }

  await db.insert(scrapeRuns).values({
    scrapedAt: now,
    totalFound,
    trackedProductCount: scraped.length,
    newProducts: newCount,
    status: "success",
    errorMessage:
      failedCategories.length > 0
        ? failedCategories.map((f) => `${f.category}: ${f.error}`).join(" | ")
        : null,
  });

  try {
    await deliverAlertNotifications(alertCandidates, now);
  } catch (error) {
    console.error("Alert delivery pipeline failed", error);
  }

  try {
    await syncFavoriteConfigsAfterScrape(now);
  } catch (error) {
    console.error("Favorite sync pipeline failed", error);
  }

  return {
    totalFound,
    trackedProductCount: scraped.length,
    newProducts: newCount,
    scrapedAt: now,
  };
}
