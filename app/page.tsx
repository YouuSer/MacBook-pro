import { getDb } from "@/lib/db";
import { products, scrapeRuns } from "@/lib/schema";
import { desc } from "drizzle-orm";
import type { Product } from "@/lib/types";
import { ProductGrid } from "./components/ProductGrid";
import { ThemeToggle } from "./components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  let availableProducts: Product[] = [];
  let unavailableProducts: Product[] = [];
  let lastScrapedAt: string | null = null;

  try {
    const db = getDb();
    const rows = await db.select().from(products).orderBy(desc(products.lastSeen));

    const lastRun = await db
      .select()
      .from(scrapeRuns)
      .orderBy(desc(scrapeRuns.scrapedAt))
      .limit(1);

    lastScrapedAt = lastRun[0]?.scrapedAt ?? null;

    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const allProducts = rows.map((row) => ({
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

    if (lastScrapedAt) {
      availableProducts = allProducts.filter((p) => p.lastSeen === lastScrapedAt);
      unavailableProducts = allProducts.filter((p) => p.lastSeen !== lastScrapedAt);
    } else {
      availableProducts = allProducts;
    }
  } catch {
    // DB not initialized yet — show empty state
  }

  return (
    <>
      {/* Sticky header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg)]/80 border-b border-[var(--border)]/50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold">MacBook Pro Refurb</span>
            <span className="hidden sm:inline text-xs text-[var(--text-tertiary)]">
              Apple France
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {availableProducts.length === 0 && unavailableProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-base text-[var(--text-secondary)] mb-4">
              Aucun produit pour le moment
            </p>
            <p className="text-sm text-[var(--text-tertiary)]">
              Lancez un premier scan en appelant{" "}
              <code className="bg-[var(--surface-secondary)] px-2 py-1 rounded-lg text-[var(--accent-green)] text-xs">
                /api/scrape
              </code>
            </p>
          </div>
        ) : (
          <ProductGrid products={availableProducts} unavailableProducts={unavailableProducts} />
        )}
      </main>

      {/* Footer */}
      {lastScrapedAt && (
        <footer className="text-center py-6 text-[11px] text-[var(--text-tertiary)]">
          Dernier scan : {new Date(lastScrapedAt).toLocaleString("fr-FR")}
        </footer>
      )}
    </>
  );
}
