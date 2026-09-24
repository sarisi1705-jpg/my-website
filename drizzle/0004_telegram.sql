ALTER TABLE `admin_users` ADD `telegram_user_id` integer;--> statement-breakpoint
ALTER TABLE `admin_users` ADD `telegram_link_code` text;--> statement-breakpoint
ALTER TABLE `admin_users` ADD `telegram_link_expires` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_telegram_unique` ON `admin_users` (`telegram_user_id`);