import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priceHistory } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partNumber: string }> }
) {
  const { partNumber } = await params;
  const decoded = decodeURIComponent(partNumber);

  const history = await db
    .select({
      price: priceHistory.price,
      scrapedAt: priceHistory.scrapedAt,
    })
    .from(priceHistory)
    .where(eq(priceHistory.partNumber, decoded))
    .orderBy(asc(priceHistory.scrapedAt));

  return NextResponse.json(history);
}
