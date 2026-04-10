CREATE TABLE `alert_deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rule_id` integer NOT NULL,
	`part_number` text NOT NULL,
	`product_title` text NOT NULL,
	`event_type` text NOT NULL,
	`current_price` real NOT NULL,
	`previous_price` real,
	`status` text NOT NULL,
	`error_message` text,
	`scraped_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`rule_id`) REFERENCES `alert_rules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `alert_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`channel_type` text NOT NULL,
	`webhook_url` text NOT NULL,
	`triggers_json` text NOT NULL,
	`filters_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
