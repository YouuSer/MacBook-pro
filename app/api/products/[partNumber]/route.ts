import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { priceHistory } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import { toApiError } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ partNumber: string }> }
) {
  try {
    const { partNumber } = await params;
    const decoded = decodeURIComponent(partNumber);
    const db = getDb();

    const url = new URL(request.url);
    const source = url.searchParams.get("source") ?? "apple_refurb";

    const history = await db
      .select({
        price: priceHistory.price,
        firstSeenAt: priceHistory.firstSeenAt,
        lastSeenAt: priceHistory.lastSeenAt,
      })
      .from(priceHistory)
      .where(
        and(
          eq(priceHistory.source, source),
          eq(priceHistory.productId, decoded)
        )
      )
      .orderBy(asc(priceHistory.firstSeenAt));

    return NextResponse.json(history);
  } catch (error) {
    const apiError = toApiError(error, "PRODUCT_HISTORY_FAILED");
    return NextResponse.json(apiError, { status: 500 });
  }
}
