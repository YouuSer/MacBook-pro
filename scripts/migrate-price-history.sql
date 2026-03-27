-- Migration: price_history scraped_at → first_seen_at + last_seen_at
-- Consolidates rows with same part_number and price into a single row

-- 1. Create new table
CREATE TABLE `price_history_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`part_number` text NOT NULL,
	`price` real NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	FOREIGN KEY (`part_number`) REFERENCES `products`(`part_number`) ON UPDATE no action ON DELETE no action
);

-- 2. Migrate data: group consecutive same-price entries per product
-- Since we can't easily detect "consecutive" in SQL, we group by (part_number, price)
-- and take MIN(scraped_at) as first_seen_at and MAX(scraped_at) as last_seen_at
INSERT INTO price_history_new (part_number, price, first_seen_at, last_seen_at)
SELECT part_number, price, MIN(scraped_at), MAX(scraped_at)
FROM price_history
GROUP BY part_number, price;

-- 3. Drop old table and rename new one
DROP TABLE price_history;
ALTER TABLE price_history_new RENAME TO price_history;
