import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { buildFavoriteDetail } from "@/lib/product-view";
import {
  favoriteConfigs,
  favoriteEvents,
  priceHistory,
  products,
  scrapeRuns,
} from "@/lib/schema";
import { toApiError } from "@/lib/api-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const favoriteId = Number(id);

    if (!Number.isInteger(favoriteId) || favoriteId <= 0) {
      return NextResponse.json(
        { error: "Identifiant de favori invalide.", code: "INVALID_FAVORITE_ID" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [favoriteRow] = await db
      .select()
      .from(favoriteConfigs)
      .where(eq(favoriteConfigs.id, favoriteId))
      .limit(1);

    if (!favoriteRow) {
      return NextResponse.json(
        { error: "Favori introuvable.", code: "FAVORITE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const [productRows, historyRows, successfulRuns, eventRows] = await Promise.all([
      db
        .select({
          partNumber: products.partNumber,
          title: products.title,
          currentPrice: products.currentPrice,
          originalPrice: products.originalPrice,
          savingsPercent: products.savingsPercent,
          savings: products.savings,
          productLine: products.productLine,
          chip: products.chip,
          screenSize: products.screenSize,
          memory: products.memory,
          storage: products.storage,
          color: products.color,
          releaseYear: products.releaseYear,
          productUrl: products.productUrl,
          imageUrl: products.imageUrl,
          firstSeen: products.firstSeen,
          lastSeen: products.lastSeen,
        })
        .from(products),
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
      db
        .select()
        .from(favoriteEvents)
        .where(eq(favoriteEvents.favoriteId, favoriteId))
        .orderBy(desc(favoriteEvents.createdAt))
        .limit(30),
    ]);

    return NextResponse.json(
      buildFavoriteDetail({
        favorite: favoriteRow,
        productRows,
        historyRows,
        successfulRuns,
        currentScrapedAt: successfulRuns[0]?.scrapedAt ?? null,
        eventRows,
      })
    );
  } catch (error) {
    const apiError = toApiError(error, "FAVORITE_DETAIL_FAILED");
    return NextResponse.json(apiError, { status: 500 });
  }
}
