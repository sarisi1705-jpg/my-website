CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`payment_method` text NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`delivery_zone` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`customer_notes` text DEFAULT '' NOT NULL,
	`items` text NOT NULL,
	`subtotal_minor` integer NOT NULL,
	`delivery_fee_minor` integer NOT NULL,
	`total_minor` integer NOT NULL,
	`currency` text DEFAULT 'ILS' NOT NULL,
	`assigned_to` integer,
	`internal_notes` text DEFAULT '' NOT NULL,
	`ip_hash` text,
	`user_agent` text,
	`notified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orders_status_created_idx` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_created_idx` ON `orders` (`created_at`);