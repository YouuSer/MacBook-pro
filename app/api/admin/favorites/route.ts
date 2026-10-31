import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { requireAdminAccess } from "@/lib/admin-route";
import { getDb } from "@/lib/db";
import {
  buildFavoriteConfigIdentity,
} from "@/lib/favorites";
import { resolveProductLine } from "@/lib/product-catalog";
import { buildFavoriteConfigsView } from "@/lib/product-view";
import {
  favoriteConfigs,
  favoriteEvents,
  products,
  scrapeRuns,
} from "@/lib/schema";
import { toApiError } from "@/lib/api-error";

export async function GET() {
  const denied = await requireAdminAccess();

  if (denied) {
    return denied;
  }

  try {
    const db = getDb();
    const [favoriteRows, productRows, eventRows, successfulRun] = await Promise.all([
      db.select().from(favoriteConfigs).orderBy(desc(favoriteConfigs.updatedAt)),
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
        .select()
        .from(favoriteEvents)
        .orderBy(desc(favoriteEvents.createdAt))
        .limit(50),
      db
        .select({ scrapedAt: scrapeRuns.scrapedAt })
        .from(scrapeRuns)
        .where(eq(scrapeRuns.status, "success"))
        .orderBy(desc(scrapeRuns.scrapedAt))
        .limit(1),
    ]);

    return NextResponse.json({
      favorites: buildFavoriteConfigsView({
        favorites: favoriteRows,
        productRows,
        currentScrapedAt: successfulRun[0]?.scrapedAt ?? null,
      }),
      events: eventRows,
    });
  } catch (error) {
    const apiError = toApiError(error, "ADMIN_FAVORITES_LOAD_FAILED");
    return NextResponse.json(apiError, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdminAccess();

  if (denied) {
    return denied;
  }

  try {
    const payload = (await request.json()) as { partNumber?: string };
    const partNumber = payload.partNumber?.trim() ?? "";

    if (!partNumber) {
      return NextResponse.json(
        { error: "La référence produit est requise.", code: "INVALID_PART_NUMBER" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [productRow] = await db
      .select()
      .from(products)
      .where(eq(products.partNumber, partNumber))
      .limit(1);

    if (!productRow) {
      return NextResponse.json(
        { error: "Produit introuvable.", code: "PRODUCT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const productLine = resolveProductLine(productRow.productLine, productRow.title);

    if (!productLine) {
      return NextResponse.json(
        { error: "Impossible de normaliser la configuration produit.", code: "INVALID_PRODUCT_CONFIG" },
        { status: 400 }
      );
    }

    const identity = buildFavoriteConfigIdentity({
      title: productRow.title,
      partNumber: productRow.partNumber,
      productLine,
      chip: productRow.chip ?? "",
      screenSize: productRow.screenSize ?? "",
      memory: productRow.memory ?? "",
      storage: productRow.storage ?? "",
      color: productRow.color ?? "",
      releaseYear: productRow.releaseYear ?? "",
    });
    const [existingFavorite] = await db
      .select()
      .from(favoriteConfigs)
      .where(eq(favoriteConfigs.configKey, identity.configKey))
      .limit(1);

    if (existingFavorite) {
      return NextResponse.json({
        success: true,
        favorite: existingFavorite,
        created: false,
      });
    }

    const [lastSuccessfulRun] = await db
      .select({ scrapedAt: scrapeRuns.scrapedAt })
      .from(scrapeRuns)
      .where(eq(scrapeRuns.status, "success"))
      .orderBy(desc(scrapeRuns.scrapedAt))
      .limit(1);
    const now = new Date().toISOString();
    const isCurrentlyAvailable =
      Boolean(lastSuccessfulRun?.scrapedAt) &&
      productRow.lastSeen === lastSuccessfulRun.scrapedAt;
    const inserted = await db
      .insert(favoriteConfigs)
      .values({
        configKey: identity.configKey,
        label: identity.label,
        sourcePartNumber: productRow.partNumber,
        currentState: isCurrentlyAvailable ? "available" : "unavailable",
        bestCurrentPrice: isCurrentlyAvailable ? productRow.currentPrice : null,
        lastMatchedAt: isCurrentlyAvailable ? productRow.lastSeen : null,
        lastEventAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({
      success: true,
      favorite: inserted[0],
      created: true,
    });
  } catch (error) {
    const apiError = toApiError(error, "ADMIN_FAVORITES_CREATE_FAILED");
    return NextResponse.json(apiError, { status: 400 });
  }
}
