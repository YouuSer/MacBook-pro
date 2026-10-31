CREATE TABLE `favorite_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`config_key` text NOT NULL,
	`label` text NOT NULL,
	`source_part_number` text NOT NULL,
	`current_state` text NOT NULL,
	`best_current_price` real,
	`last_matched_at` text,
	`last_event_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorite_configs_config_key_unique` ON `favorite_configs` (`config_key`);--> statement-breakpoint
CREATE TABLE `favorite_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`favorite_id` integer NOT NULL,
	`event_type` text NOT NULL,
	`part_number` text NOT NULL,
	`product_title` text NOT NULL,
	`current_price` real,
	`previous_price` real,
	`delivery_status` text,
	`delivery_error` text,
	`delivered_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`favorite_id`) REFERENCES `favorite_configs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `favorite_notification_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`channel_type` text NOT NULL,
	`webhook_url` text NOT NULL,
	`triggers_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
