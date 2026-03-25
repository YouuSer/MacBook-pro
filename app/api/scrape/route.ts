import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scrapeRuns } from "@/lib/schema";
import { runScrapeJob } from "@/lib/scrape-job";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret in production
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runScrapeJob();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    await db.insert(scrapeRuns).values({
      scrapedAt: new Date().toISOString(),
      status: "error",
      errorMessage: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
