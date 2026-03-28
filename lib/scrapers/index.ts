import type { Scraper } from "./types";
import { AppleRefurbScraper } from "./apple-refurb";
import { AmazonScraper } from "./amazon";

export function getEnabledScrapers(): Scraper[] {
  const scrapers: Scraper[] = [new AppleRefurbScraper()];

  if (process.env.AMAZON_PA_API_ACCESS_KEY) {
    scrapers.push(new AmazonScraper());
  }

  return scrapers;
}

export { AppleRefurbScraper } from "./apple-refurb";
export { AmazonScraper } from "./amazon";
export type { Scraper, ScrapeResult, ScrapedProduct, ProductSource } from "./types";
