CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`part_number` text NOT NULL,
	`price` real NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	FOREIGN KEY (`part_number`) REFERENCES `products`(`part_number`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`part_number` text PRIMARY KEY NOT NULL,
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
	`last_seen` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scrape_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scraped_at` text NOT NULL,
	`total_found` integer,
	`pro_chip_count` integer,
	`new_products` integer,
	`status` text,
	`error_message` text
);
