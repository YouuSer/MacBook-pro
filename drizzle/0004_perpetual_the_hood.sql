ALTER TABLE `products` ADD `category` text;--> statement-breakpoint
ALTER TABLE `products` ADD `product_line_label` text;
--> statement-breakpoint
UPDATE `products` SET `category` = 'mac' WHERE `category` IS NULL;--> statement-breakpoint
UPDATE `products` SET `product_line` = 'macbookair' WHERE `product_line` = 'air';--> statement-breakpoint
UPDATE `products` SET `product_line` = 'macbookpro' WHERE `product_line` = 'pro';
--> statement-breakpoint
UPDATE `favorite_configs` SET `config_key` = 'macbookair' || substr(`config_key`, 4) WHERE `config_key` LIKE 'air|%';--> statement-breakpoint
UPDATE `favorite_configs` SET `config_key` = 'macbookpro' || substr(`config_key`, 4) WHERE `config_key` LIKE 'pro|%';--> statement-breakpoint
UPDATE `alert_rules` SET `filters_json` = replace(replace(`filters_json`, '"air"', '"macbookair"'), '"pro"', '"macbookpro"');
