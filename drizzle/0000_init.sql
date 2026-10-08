CREATE TABLE `bests` (
	`player_id` text NOT NULL,
	`level_set_version` text NOT NULL,
	`best_level` integer NOT NULL,
	`achieved_at` integer NOT NULL,
	PRIMARY KEY(`player_id`, `level_set_version`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bests_version_level_idx` ON `bests` (`level_set_version`,`best_level`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`player_id` text,
	`session_id` text,
	`level` integer,
	`client_ts` integer,
	`server_ts` integer NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE INDEX `events_name_ts_idx` ON `events` (`name`,`server_ts`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`public_id` text NOT NULL,
	`player_id` text NOT NULL,
	`level_set_version` text NOT NULL,
	`reached_level` integer NOT NULL,
	`cleared` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `results_session_idx` ON `results` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `results_public_idx` ON `results` (`public_id`);--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`level` integer NOT NULL,
	`created_at` integer NOT NULL,
	`shown_at` integer,
	`deadline_at` integer,
	`human_status` text,
	`human_choice` text,
	`human_elapsed_ms` integer,
	`human_client_elapsed_ms` integer,
	`human_submitted_at` integer,
	`ai_status` text DEFAULT 'pending' NOT NULL,
	`ai_started_at` integer,
	`ai_completed_at` integer,
	`ai_choice` text,
	`ai_correct` integer,
	`ai_elapsed_ms` integer,
	`ai_model_elapsed_ms` integer,
	`ai_confidence` real,
	`ai_probabilities` text,
	`ai_error_code` text,
	`ai_request_id` text,
	`winner` text,
	`faster_than_ai` integer,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rounds_session_level_idx` ON `rounds` (`session_id`,`level`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`level_set_version` text NOT NULL,
	`level` integer NOT NULL,
	`lives` integer NOT NULL,
	`faster_than_ai_count` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`reached_level` integer DEFAULT 1 NOT NULL,
	`cleared` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_player_created_idx` ON `sessions` (`player_id`,`created_at`);