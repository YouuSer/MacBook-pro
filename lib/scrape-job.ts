import { getDb } from "./db";
import { products, priceHistory, scrapeRuns } from "./schema";
import { scrapeAppleRefurb } from "./scraper";
import { desc, eq } from "drizzle-orm";

function isReappearingProduct(
  lastSeen: string | null | undefined,
  lastSuccessfulScrapedAt: string | null
) {
  if (!lastSeen || !lastSuccessfulScrapedAt) {
    return false;
  }

  return lastSeen < lastSuccessfulScrapedAt;
}

export async function runScrapeJob() {
  const db = getDb();
  const now = new Date().toISOString();

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
    const isReappearing = isReappearingProduct(
      exists?.lastSeen,
      lastSuccessfulScrapedAt
    );

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

  return {
    totalFound,
    trackedProductCount: scraped.length,
    newProducts: newCount,
    scrapedAt: now,
  };
}
