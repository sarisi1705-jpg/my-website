CREATE TABLE `inquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`company` text,
	`preferred_contact` text DEFAULT 'phone' NOT NULL,
	`product_id` integer,
	`product_snapshot` text,
	`quantity` integer,
	`message` text DEFAULT '' NOT NULL,
	`source_path` text,
	`status` text DEFAULT 'new' NOT NULL,
	`assigned_to` integer,
	`internal_notes` text DEFAULT '' NOT NULL,
	`ip_hash` text,
	`user_agent` text,
	`notified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inquiries_status_created_idx` ON `inquiries` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `inquiries_created_idx` ON `inquiries` (`created_at`);