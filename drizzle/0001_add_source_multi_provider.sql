-- Migration: add source column for multi-provider support
-- Recreate tables with composite PK (source, product_id)

-- 1. Create new products table
CREATE TABLE `products_new` (
	`source` text NOT NULL DEFAULT 'apple_refurb',
	`product_id` text NOT NULL,
	`title` text NOT NULL,
	`current_price` real NOT NULL,
	`original_price` real NOT NULL,
	`savings_percent` real NOT NULL,
	`savings` text,
	`chip` text,
	`screen_size` text,
	`memory` text,
	`storage` text,
	`color` text,
	`release_year` text,
	`product_url` text,
	`image_url` text,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL,
	`condition` text,
	PRIMARY KEY (`source`, `product_id`)
);
--> statement-breakpoint

-- 2. Migrate existing products data
INSERT INTO `products_new` (`source`, `product_id`, `title`, `current_price`, `original_price`, `savings_percent`, `savings`, `chip`, `screen_size`, `memory`, `storage`, `color`, `release_year`, `product_url`, `image_url`, `first_seen`, `last_seen`, `condition`)
SELECT 'apple_refurb', `part_number`, `title`, `current_price`, `original_price`, `savings_percent`, `savings`, `chip`, `screen_size`, `memory`, `storage`, `color`, `release_year`, `product_url`, `image_url`, `first_seen`, `last_seen`, 'refurbished'
FROM `products`;
--> statement-breakpoint

-- 3. Create new price_history table
CREATE TABLE `price_history_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL DEFAULT 'apple_refurb',
	`product_id` text NOT NULL,
	`price` real NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint

-- 4. Migrate existing price history data
INSERT INTO `price_history_new` (`id`, `source`, `product_id`, `price`, `first_seen_at`, `last_seen_at`)
SELECT `id`, 'apple_refurb', `part_number`, `price`, `first_seen_at`, `last_seen_at`
FROM `price_history`;
--> statement-breakpoint

-- 5. Drop old tables
DROP TABLE `price_history`;
--> statement-breakpoint
DROP TABLE `products`;
--> statement-breakpoint

-- 6. Rename new tables
ALTER TABLE `products_new` RENAME TO `products`;
--> statement-breakpoint
ALTER TABLE `price_history_new` RENAME TO `price_history`;
--> statement-breakpoint

-- 7. Add source column to scrape_runs
ALTER TABLE `scrape_runs` ADD COLUMN `source` text NOT NULL DEFAULT 'apple_refurb';
