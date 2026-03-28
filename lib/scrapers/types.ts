export type ProductSource = "apple_refurb" | "amazon";

export interface ScrapedProduct {
  source: ProductSource;
  productId: string;
  title: string;
  currentPrice: number;
  originalPrice: number;
  savingsPercent: number;
  savings: string;
  chip: string;
  screenSize: string;
  memory: string;
  storage: string;
  color: string;
  releaseYear: string;
  productUrl: string;
  imageUrl: string;
  condition?: "refurbished" | "new" | "used";
}

export interface ScrapeResult {
  source: ProductSource;
  products: ScrapedProduct[];
  totalFound: number;
}

export interface Scraper {
  source: ProductSource;
  scrape(): Promise<ScrapeResult>;
}
