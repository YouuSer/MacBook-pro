import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  partNumber: text("part_number").primaryKey(),
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
});

export const priceHistory = sqliteTable("price_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partNumber: text("part_number")
    .notNull()
    .references(() => products.partNumber),
  price: real("price").notNull(),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
});

export const scrapeRuns = sqliteTable("scrape_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scrapedAt: text("scraped_at").notNull(),
  totalFound: integer("total_found"),
  proChipCount: integer("pro_chip_count"),
  newProducts: integer("new_products"),
  status: text("status"),
  errorMessage: text("error_message"),
});
