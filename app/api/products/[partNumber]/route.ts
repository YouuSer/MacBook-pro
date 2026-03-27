import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { priceHistory } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { toApiError } from "@/lib/api-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partNumber: string }> }
) {
  try {
    const { partNumber } = await params;
    const decoded = decodeURIComponent(partNumber);
    const db = getDb();

    const history = await db
      .select({
        price: priceHistory.price,
        scrapedAt: priceHistory.scrapedAt,
      })
      .from(priceHistory)
      .where(eq(priceHistory.partNumber, decoded))
      .orderBy(asc(priceHistory.scrapedAt));

    return NextResponse.json(history);
  } catch (error) {
    const apiError = toApiError(error, "PRODUCT_HISTORY_FAILED");
    return NextResponse.json(apiError, { status: 500 });
  }
}
