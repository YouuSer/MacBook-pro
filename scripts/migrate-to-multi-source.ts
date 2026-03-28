/**
 * Migration script: add multi-source support (source column, composite PK)
 *
 * Run with: npx tsx scripts/migrate-to-multi-source.ts
 *
 * This migrates the existing single-source schema to support multiple sources
 * (apple_refurb, amazon). Existing data gets source = 'apple_refurb'.
 */

import { createClient } from "@libsql/client";

const DB_URL = process.env.TURSO_DATABASE_URL || "file:./local.db";
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

async function migrate() {
  const client = createClient({
    url: DB_URL,
    authToken: AUTH_TOKEN,
  });

  console.log(`Migrating database: ${DB_URL}`);

  // Check if already migrated (products table has source column)
  try {
    await client.execute("SELECT source FROM products LIMIT 1");
    console.log("Database already migrated — skipping.");
    return;
  } catch {
    // Column doesn't exist, proceed with migration
  }

  const statements = [
    // 1. Create new products table with composite PK
    `CREATE TABLE products_new (
      source text NOT NULL DEFAULT 'apple_refurb',
      product_id text NOT NULL,
      title text NOT NULL,
      current_price real NOT NULL,
      original_price real NOT NULL,
      savings_percent real NOT NULL,
      savings text,
      chip text,
      screen_size text,
      memory text,
      storage text,
      color text,
      release_year text,
      product_url text,
      image_url text,
      first_seen text NOT NULL,
      last_seen text NOT NULL,
      condition text,
      PRIMARY KEY (source, product_id)
    )`,

    // 2. Migrate existing products
    `INSERT INTO products_new (source, product_id, title, current_price, original_price, savings_percent, savings, chip, screen_size, memory, storage, color, release_year, product_url, image_url, first_seen, last_seen, condition)
     SELECT 'apple_refurb', part_number, title, current_price, original_price, savings_percent, savings, chip, screen_size, memory, storage, color, release_year, product_url, image_url, first_seen, last_seen, 'refurbished'
     FROM products`,

    // 3. Create new price_history table
    `CREATE TABLE price_history_new (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      source text NOT NULL DEFAULT 'apple_refurb',
      product_id text NOT NULL,
      price real NOT NULL,
      first_seen_at text NOT NULL,
      last_seen_at text NOT NULL
    )`,

    // 4. Migrate existing price history
    `INSERT INTO price_history_new (id, source, product_id, price, first_seen_at, last_seen_at)
     SELECT id, 'apple_refurb', part_number, price, first_seen_at, last_seen_at
     FROM price_history`,

    // 5. Drop old tables
    `DROP TABLE price_history`,
    `DROP TABLE products`,

    // 6. Rename new tables
    `ALTER TABLE products_new RENAME TO products`,
    `ALTER TABLE price_history_new RENAME TO price_history`,

    // 7. Add source column to scrape_runs
    `ALTER TABLE scrape_runs ADD COLUMN source text NOT NULL DEFAULT 'apple_refurb'`,
  ];

  for (const sql of statements) {
    console.log(`  Running: ${sql.slice(0, 60)}...`);
    await client.execute(sql);
  }

  console.log("Migration completed successfully!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
