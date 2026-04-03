import { getDb, inspectDbConfig } from "@/lib/db";
import { priceHistory, products, scrapeRuns } from "@/lib/schema";
import { parseCoreCounts, resolveProductLine } from "@/lib/product-catalog";
import { desc } from "drizzle-orm";
import type { Product } from "@/lib/types";
import { toApiError } from "@/lib/api-error";
import { ProductGrid } from "./components/ProductGrid";
import { ScrapeButton } from "./components/ScrapeButton";
import { ThemeToggle } from "./components/ThemeToggle";

export const dynamic = "force-dynamic";
const PRICE_EPSILON = 0.001;

function formatParisDateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
  });
}

function isSamePrice(a: number, b: number) {
  return Math.abs(a - b) < PRICE_EPSILON;
}

function buildDistinctPriceHistory(
  rows: Array<{ partNumber: string; price: number }>
) {
  const historyByPartNumber = new Map<string, number[]>();

  for (const row of rows) {
    const history = historyByPartNumber.get(row.partNumber);

    if (!history) {
      historyByPartNumber.set(row.partNumber, [row.price]);
      continue;
    }

    if (!isSamePrice(history[history.length - 1], row.price)) {
      history.push(row.price);
    }
  }

  return historyByPartNumber;
}

function getPreviousDistinctPrice(currentPrice: number, history: number[]) {
  return history.find((price) => !isSamePrice(price, currentPrice)) ?? null;
}

function getPriceTrend(
  currentPrice: number,
  previousPrice: number | null
): Product["priceTrend"] {
  if (previousPrice === null) {
    return null;
  }

  if (currentPrice < previousPrice) {
    return "down";
  }

  if (currentPrice > previousPrice) {
    return "up";
  }

  return null;
}

export default async function Home() {
  let availableProducts: Product[] = [];
  let unavailableProducts: Product[] = [];
  let lastScrapedAt: string | null = null;
  let loadError: ReturnType<typeof toApiError> | null = null;
  const lastDeployedAt = process.env.NEXT_PUBLIC_DEPLOYED_AT ?? null;

  const dbConfig = inspectDbConfig();
  const dbTargetLabel =
    dbConfig.kind === "sqlite-local"
      ? `SQLite locale (${dbConfig.target})`
      : dbConfig.kind === "turso"
        ? `Turso (${dbConfig.target})`
        : "configuration invalide";

  try {
    const db = getDb();
    const rows = await db.select().from(products).orderBy(desc(products.lastSeen));
    const historyRows = await db
      .select({
        partNumber: priceHistory.partNumber,
        price: priceHistory.price,
      })
      .from(priceHistory)
      .orderBy(desc(priceHistory.firstSeenAt));

    const lastRun = await db
      .select()
      .from(scrapeRuns)
      .orderBy(desc(scrapeRuns.scrapedAt))
      .limit(1);

    lastScrapedAt = lastRun[0]?.scrapedAt ?? null;

    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();
    const distinctPriceHistory = buildDistinctPriceHistory(historyRows);

    const allProducts = rows.map((row) => {
      const { cpuCores, gpuCores } = parseCoreCounts(row.title);
      const priceHistoryForProduct =
        distinctPriceHistory.get(row.partNumber) ?? [];
      const previousPrice = getPreviousDistinctPrice(
        row.currentPrice,
        priceHistoryForProduct
      );

      return {
        partNumber: row.partNumber,
        title: row.title,
        currentPrice: row.currentPrice,
        previousPrice,
        priceTrend: getPriceTrend(row.currentPrice, previousPrice),
        originalPrice: row.originalPrice,
        savingsPercent: row.savingsPercent,
        savings: row.savings ?? "",
        productLine: resolveProductLine(row.productLine, row.title) ?? "pro",
        chip: row.chip ?? "Unknown",
        cpuCores,
        gpuCores,
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
      };
    });

    if (lastScrapedAt) {
      availableProducts = allProducts.filter((p) => p.lastSeen === lastScrapedAt);
      unavailableProducts = allProducts.filter((p) => p.lastSeen !== lastScrapedAt);
    } else {
      availableProducts = allProducts;
    }
  } catch (error) {
    loadError = toApiError(error, "PRODUCTS_LOAD_FAILED");
    console.error("Failed to load home page data", error);
  }

  return (
    <>
      {/* Sticky header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg)]/80 border-b border-[var(--border)]/50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold">MacBook Air & Pro Refurb</span>
            <span className="hidden sm:inline text-xs text-[var(--text-tertiary)]">
              Apple France
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ScrapeButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loadError ? (
          <div className="max-w-2xl mx-auto py-16">
            <div className="rounded-3xl border border-red-500/20 bg-red-500/8 px-6 py-5 text-left">
              <p className="text-base font-semibold text-[var(--text-primary)] mb-2">
                Impossible de charger les produits
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {loadError.error}
              </p>
              <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                Source DB : {dbTargetLabel}
              </p>
              {dbConfig.kind === "invalid" && dbConfig.error && (
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Détail config : {dbConfig.error}
                </p>
              )}
            </div>
          </div>
        ) : availableProducts.length === 0 && unavailableProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-base text-[var(--text-secondary)] mb-4">
              Aucun MacBook Air ou Pro pour le moment
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
      {(lastScrapedAt || lastDeployedAt) && (
        <footer className="py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 text-center text-[11px] text-[var(--text-tertiary)] sm:flex-row sm:justify-center sm:gap-4">
            {lastScrapedAt && (
              <span>Dernier scan : {formatParisDateTime(lastScrapedAt)}</span>
            )}
            {lastDeployedAt && (
              <span>Dernier déploiement : {formatParisDateTime(lastDeployedAt)}</span>
            )}
          </div>
        </footer>
      )}
    </>
  );
}
