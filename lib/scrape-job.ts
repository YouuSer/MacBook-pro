import { getDb } from "./db";
import { alertDeliveries, alertRules, priceHistory, products, scrapeRuns } from "./schema";
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
import type { ScrapedProduct } from "./scraper";

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

  const { products: scraped, totalFound } = await scrapeAppleRefurb();

  // Get existing products to detect new ones
  const existing = await db.select().from(products);
  const existingMap = new Map(existing.map((p) => [p.partNumber, p]));

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

    if (alertCandidate) {
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
          productLine: p.productLine,
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
        productLine: p.productLine,
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

  await db.insert(scrapeRuns).values({
    scrapedAt: now,
    totalFound,
    trackedProductCount: scraped.length,
    newProducts: newCount,
    status: "success",
  });

  try {
    await deliverAlertNotifications(alertCandidates, now);
  } catch (error) {
    console.error("Alert delivery pipeline failed", error);
  }

  return {
    totalFound,
    trackedProductCount: scraped.length,
    newProducts: newCount,
    scrapedAt: now,
  };
}
