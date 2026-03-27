import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scrapeRuns } from "@/lib/schema";
import { runScrapeJob } from "@/lib/scrape-job";
import { toApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Optional cron authentication: a missing header should not block manual bootstrap.
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
  }

  try {
    const result = await runScrapeJob();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const apiError = toApiError(error, "SCRAPE_FAILED");

    try {
      const db = getDb();
      await db.insert(scrapeRuns).values({
        scrapedAt: new Date().toISOString(),
        status: "error",
        errorMessage: apiError.error,
      });
    } catch (logError) {
      console.error("Failed to store scrape error", logError);
    }

    return NextResponse.json(apiError, { status: 500 });
  }
}
