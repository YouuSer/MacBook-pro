import { sqliteTable, text, real, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  source: text("source").notNull().default("apple_refurb"),
  productId: text("product_id").notNull(),
  title: text("title").notNull(),
  currentPrice: real("current_price").notNull(),
  originalPrice: real("original_price").notNull(),
  savingsPercent: real("savings_percent").notNull(),
  savings: text("savings"),
  chip: text("chip"),
  screenSize: text("screen_size"),
  memory: text("memory"),
  storage: text("storage"),
  color: text("color"),
  releaseYear: text("release_year"),
  productUrl: text("product_url"),
  imageUrl: text("image_url"),
  firstSeen: text("first_seen").notNull(),
  lastSeen: text("last_seen").notNull(),
  condition: text("condition"),
}, (table) => [
  primaryKey({ columns: [table.source, table.productId] }),
]);

export const priceHistory = sqliteTable("price_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull().default("apple_refurb"),
  productId: text("product_id").notNull(),
  price: real("price").notNull(),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
});

export const scrapeRuns = sqliteTable("scrape_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull().default("apple_refurb"),
  scrapedAt: text("scraped_at").notNull(),
  totalFound: integer("total_found"),
  proChipCount: integer("pro_chip_count"),
  newProducts: integer("new_products"),
  status: text("status"),
  errorMessage: text("error_message"),
});
