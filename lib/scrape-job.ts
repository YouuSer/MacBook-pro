import { getDb } from "./db";
import { products, priceHistory, scrapeRuns } from "./schema";
import { eq, and, desc } from "drizzle-orm";
import type { Scraper } from "./scrapers/types";
import { getEnabledScrapers } from "./scrapers";

export async function runScrapeJobForSource(scraper: Scraper) {
  const db = getDb();
  const now = new Date().toISOString();

  const { products: scraped, totalFound } = await scraper.scrape();

  // Get existing products for this source to detect new ones
  const existing = await db
    .select()
    .from(products)
    .where(eq(products.source, scraper.source));
  const existingMap = new Map(existing.map((p) => [p.productId, p]));

  let newCount = 0;

  for (const p of scraped) {
    const exists = existingMap.get(p.productId);

    if (exists) {
      await db
        .update(products)
        .set({
          currentPrice: p.currentPrice,
          originalPrice: p.originalPrice,
          savingsPercent: p.savingsPercent,
          savings: p.savings,
          lastSeen: now,
        })
        .where(
          and(
            eq(products.source, p.source),
            eq(products.productId, p.productId)
          )
        );
    } else {
      await db.insert(products).values({
        source: p.source,
        productId: p.productId,
        title: p.title,
        currentPrice: p.currentPrice,
        originalPrice: p.originalPrice,
        savingsPercent: p.savingsPercent,
        savings: p.savings,
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
        condition: p.condition ?? null,
      });
      newCount++;
    }

    // Consolidate price history: update lastSeenAt if price unchanged, otherwise insert new row
    const lastEntry = await db
      .select()
      .from(priceHistory)
      .where(
        and(
          eq(priceHistory.source, p.source),
          eq(priceHistory.productId, p.productId)
        )
      )
      .orderBy(desc(priceHistory.lastSeenAt))
      .limit(1);

    if (lastEntry.length > 0 && lastEntry[0].price === p.currentPrice) {
      await db
        .update(priceHistory)
        .set({ lastSeenAt: now })
        .where(eq(priceHistory.id, lastEntry[0].id));
    } else {
      await db.insert(priceHistory).values({
        source: p.source,
        productId: p.productId,
        price: p.currentPrice,
        firstSeenAt: now,
        lastSeenAt: now,
      });
    }
  }

  await db.insert(scrapeRuns).values({
    source: scraper.source,
    scrapedAt: now,
    totalFound,
    proChipCount: scraped.length,
    newProducts: newCount,
    status: "success",
  });

  return {
    source: scraper.source,
    totalFound,
    proChipCount: scraped.length,
    newProducts: newCount,
    scrapedAt: now,
  };
}

export async function runAllScrapeJobs() {
  const scrapers = getEnabledScrapers();
  const results = [];

  for (const scraper of scrapers) {
    const result = await runScrapeJobForSource(scraper);
    results.push(result);
  }

  return results;
}

// Backward-compatible: run only Apple scraper
export async function runScrapeJob() {
  const { AppleRefurbScraper } = await import("./scrapers/apple-refurb");
  return runScrapeJobForSource(new AppleRefurbScraper());
}
