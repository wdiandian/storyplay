CREATE TABLE `model_usage_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`access_mode` text DEFAULT 'official' NOT NULL,
	`feature` text NOT NULL,
	`domains_json` text NOT NULL,
	`models_json` text NOT NULL,
	`status` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`result_json` text DEFAULT '{}' NOT NULL,
	`credits_charged` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `model_usage_user_created_at_idx` ON `model_usage_records` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `model_usage_feature_created_at_idx` ON `model_usage_records` (`feature`,`created_at`);--> statement-breakpoint
CREATE INDEX `model_usage_status_created_at_idx` ON `model_usage_records` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `credit_ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`usage_record_id` text,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`feature` text,
	`reason` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`usage_record_id`) REFERENCES `model_usage_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `credit_ledger_user_created_at_idx` ON `credit_ledger_entries` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `credit_ledger_usage_record_idx` ON `credit_ledger_entries` (`usage_record_id`);
