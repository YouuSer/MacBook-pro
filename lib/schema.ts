import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  partNumber: text("part_number").primaryKey(),
  title: text("title").notNull(),
  currentPrice: real("current_price").notNull(),
  originalPrice: real("original_price").notNull(),
  savingsPercent: real("savings_percent").notNull(),
  savings: text("savings"),
  productLine: text("product_line"),
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
  trackedProductCount: integer("tracked_product_count"),
  newProducts: integer("new_products"),
  status: text("status"),
  errorMessage: text("error_message"),
});

export const alertRules = sqliteTable("alert_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  channelType: text("channel_type").notNull(),
  webhookUrl: text("webhook_url").notNull(),
  triggersJson: text("triggers_json").notNull(),
  filtersJson: text("filters_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const alertDeliveries = sqliteTable("alert_deliveries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ruleId: integer("rule_id")
    .notNull()
    .references(() => alertRules.id),
  partNumber: text("part_number").notNull(),
  productTitle: text("product_title").notNull(),
  eventType: text("event_type").notNull(),
  currentPrice: real("current_price").notNull(),
  previousPrice: real("previous_price"),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  scrapedAt: text("scraped_at").notNull(),
  createdAt: text("created_at").notNull(),
});
