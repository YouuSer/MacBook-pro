import type { Config } from "@netlify/functions";
import { runScrapeJob } from "../../lib/scrape-job";

export default async function handler() {
  try {
    const result = await runScrapeJob();
    console.log("Scrape completed:", result);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Scrape failed:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

export const config: Config = {
  schedule: "*/30 * * * *",
};
