import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { hasAdminSession, isAdminTokenConfigured } from "@/lib/admin-auth";
import { toApiError } from "@/lib/api-error";
import { getDb, inspectDbConfig } from "@/lib/db";
import { buildFavoriteConfigsView, buildProducts } from "@/lib/product-view";
import { favoriteConfigs, priceHistory, products, scrapeRuns } from "@/lib/schema";
import type { FavoriteConfig, Product } from "@/lib/types";
import { ProductGrid } from "./components/ProductGrid";
import { ScrapeButton } from "./components/ScrapeButton";
import { SiteHeader } from "./components/SiteHeader";
import { ThemeToggle } from "./components/ThemeToggle";

export const dynamic = "force-dynamic";

function formatParisDateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
  });
}

export default async function Home() {
  let availableProducts: Product[] = [];
  let unavailableProducts: Product[] = [];
  let favoriteItems: FavoriteConfig[] = [];
  let lastScrapedAt: string | null = null;
  let loadError: ReturnType<typeof toApiError> | null = null;
  const lastDeployedAt = process.env.NEXT_PUBLIC_DEPLOYED_AT ?? null;
  const canManageFavorites = isAdminTokenConfigured()
    ? await hasAdminSession()
    : false;

  const dbConfig = inspectDbConfig();
  const dbTargetLabel =
    dbConfig.kind === "sqlite-local"
      ? `SQLite locale (${dbConfig.target})`
      : dbConfig.kind === "turso"
        ? `Turso (${dbConfig.target})`
        : "configuration invalide";

  try {
    const db = getDb();
    const [rows, historyRows, successfulRuns, favoriteRows] = await Promise.all([
      db.select().from(products).orderBy(desc(products.lastSeen)),
      db
        .select({
          partNumber: priceHistory.partNumber,
          price: priceHistory.price,
          firstSeenAt: priceHistory.firstSeenAt,
          lastSeenAt: priceHistory.lastSeenAt,
        })
        .from(priceHistory)
        .orderBy(asc(priceHistory.firstSeenAt)),
      db
        .select({ scrapedAt: scrapeRuns.scrapedAt })
        .from(scrapeRuns)
        .where(eq(scrapeRuns.status, "success"))
        .orderBy(desc(scrapeRuns.scrapedAt))
        .limit(60),
      db.select().from(favoriteConfigs).orderBy(desc(favoriteConfigs.updatedAt)),
    ]);

    lastScrapedAt = successfulRuns[0]?.scrapedAt ?? null;

    const allProducts = buildProducts({
      rows,
      historyRows,
      successfulRuns,
      favoriteRows,
    });

    favoriteItems = buildFavoriteConfigsView({
      favorites: favoriteRows,
      productRows: rows,
      currentScrapedAt: lastScrapedAt,
    });

    if (lastScrapedAt) {
      availableProducts = allProducts.filter((product) => product.lastSeen === lastScrapedAt);
      unavailableProducts = allProducts.filter((product) => product.lastSeen !== lastScrapedAt);
    } else {
      availableProducts = allProducts;
    }
  } catch (error) {
    loadError = toApiError(error, "PRODUCTS_LOAD_FAILED");
    console.error("Failed to load home page data", error);
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <Link
        href="/admin/alerts"
        className="rounded-full px-3 py-1.5 text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--fg)]"
      >
        Alertes
      </Link>
      <ScrapeButton />
      <ThemeToggle />
    </div>
  );
  const showCatalog =
    !loadError && (availableProducts.length > 0 || unavailableProducts.length > 0);

  return (
    <>
      {showCatalog ? (
        <ProductGrid
          products={availableProducts}
          unavailableProducts={unavailableProducts}
          favoriteItems={favoriteItems}
          canManageFavorites={canManageFavorites}
          headerActions={headerActions}
        />
      ) : (
        <>
          <SiteHeader actions={headerActions} />
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
                  Aucune offre reconditionnée pour le moment
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">
                  Lancez un premier scan en appelant{" "}
                  <code className="bg-[var(--surface-secondary)] px-2 py-1 rounded-lg text-[var(--accent-green)] text-xs">
                    /api/scrape
                  </code>
                </p>
              </div>
            ) : null}
          </main>
        </>
      )}
      {(lastScrapedAt || lastDeployedAt) && (
        <footer className="py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 text-center text-[11px] text-[var(--text-tertiary)] sm:flex-row sm:justify-center sm:gap-4">
            {lastScrapedAt && (
              <span>Dernier scan réussi : {formatParisDateTime(lastScrapedAt)}</span>
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
