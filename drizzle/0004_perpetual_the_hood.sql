ALTER TABLE `products` ADD `category` text;--> statement-breakpoint
ALTER TABLE `products` ADD `product_line_label` text;
--> statement-breakpoint
UPDATE `products` SET `category` = 'mac' WHERE `category` IS NULL;--> statement-breakpoint
UPDATE `products` SET `product_line` = 'macbookair' WHERE `product_line` = 'air';--> statement-breakpoint
UPDATE `products` SET `product_line` = 'macbookpro' WHERE `product_line` = 'pro';
