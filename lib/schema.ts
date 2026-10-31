import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  partNumber: text("part_number").primaryKey(),
  title: text("title").notNull(),
  currentPrice: real("current_price").notNull(),
  originalPrice: real("original_price").notNull(),
  savingsPercent: real("savings_percent").notNull(),
  savings: text("savings"),
  category: text("category"),
  productLine: text("product_line"),
  productLineLabel: text("product_line_label"),
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

export const favoriteConfigs = sqliteTable("favorite_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  configKey: text("config_key").notNull().unique(),
  label: text("label").notNull(),
  sourcePartNumber: text("source_part_number").notNull(),
  currentState: text("current_state").notNull(),
  bestCurrentPrice: real("best_current_price"),
  lastMatchedAt: text("last_matched_at"),
  lastEventAt: text("last_event_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const favoriteEvents = sqliteTable("favorite_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  favoriteId: integer("favorite_id")
    .notNull()
    .references(() => favoriteConfigs.id),
  eventType: text("event_type").notNull(),
  partNumber: text("part_number").notNull(),
  productTitle: text("product_title").notNull(),
  currentPrice: real("current_price"),
  previousPrice: real("previous_price"),
  deliveryStatus: text("delivery_status"),
  deliveryError: text("delivery_error"),
  deliveredAt: text("delivered_at"),
  createdAt: text("created_at").notNull(),
});

export const favoriteNotificationSettings = sqliteTable(
  "favorite_notification_settings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    channelType: text("channel_type").notNull(),
    webhookUrl: text("webhook_url").notNull(),
    triggersJson: text("triggers_json").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  }
);
