CREATE TABLE `dataset_revisions` (
	`hash` text PRIMARY KEY NOT NULL,
	`dataset` text NOT NULL,
	`last_contest` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingestion_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`checked_at` text NOT NULL,
	`status` text NOT NULL,
	`latest_available_contest` integer,
	`last_contest` integer NOT NULL,
	`message` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingestion_state` (
	`game` text PRIMARY KEY NOT NULL,
	`revision_hash` text NOT NULL,
	`last_contest` integer NOT NULL,
	`checked_at` text NOT NULL,
	`latest_available_contest` integer,
	`status` text NOT NULL,
	`message` text NOT NULL,
	FOREIGN KEY (`revision_hash`) REFERENCES `dataset_revisions`(`hash`) ON UPDATE no action ON DELETE no action
);
