import { db } from "@/lib/db";
import { products, scrapeRuns } from "@/lib/schema";
import { desc } from "drizzle-orm";
import type { Product } from "@/lib/types";
import { StatsBar } from "./components/StatsBar";
import { ProductGrid } from "./components/ProductGrid";
import { ThemeToggle } from "./components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  let allProducts: Product[] = [];
  let lastScrapedAt: string | null = null;

  try {
    const rows = await db.select().from(products).orderBy(desc(products.lastSeen));

    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    allProducts = rows.map((row) => ({
      partNumber: row.partNumber,
      title: row.title,
      currentPrice: row.currentPrice,
      originalPrice: row.originalPrice,
      savingsPercent: row.savingsPercent,
      savings: row.savings ?? "",
      chip: row.chip ?? "Unknown",
      screenSize: row.screenSize ?? "",
      memory: row.memory ?? "",
      storage: row.storage ?? "",
      color: row.color ?? "",
      releaseYear: row.releaseYear ?? "",
      productUrl: row.productUrl ?? "",
      imageUrl: row.imageUrl ?? "",
      firstSeen: row.firstSeen,
      lastSeen: row.lastSeen,
      isNew: row.firstSeen >= twentyFourHoursAgo,
    }));

    const lastRun = await db
      .select()
      .from(scrapeRuns)
      .orderBy(desc(scrapeRuns.scrapedAt))
      .limit(1);

    lastScrapedAt = lastRun[0]?.scrapedAt ?? null;
  } catch {
    // DB not initialized yet — show empty state
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            MacBook Pro Refurb
          </h1>
          <p className="text-[var(--muted)] mt-1">
            MacBook Pro reconditionnés avec puces Pro sur le store Apple France
          </p>
        </div>
        <ThemeToggle />
      </header>

      <StatsBar products={allProducts} lastScrapedAt={lastScrapedAt} />

      {allProducts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg text-[var(--muted)] mb-4">
            Aucun produit pour le moment
          </p>
          <p className="text-sm text-[var(--muted)]">
            Lancez un premier scan en appelant{" "}
            <code className="bg-[var(--card)] px-2 py-1 rounded text-green-400">
              /api/scrape
            </code>
          </p>
        </div>
      ) : (
        <ProductGrid products={allProducts} />
      )}
    </main>
  );
}
