ALTER TABLE `sessions` ADD `game_id` text DEFAULT 'spot-the-difference' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `model_id` text DEFAULT 'luna' NOT NULL;--> statement-breakpoint
ALTER TABLE `results` ADD `game_id` text DEFAULT 'spot-the-difference' NOT NULL;--> statement-breakpoint
ALTER TABLE `results` ADD `model_id` text DEFAULT 'luna' NOT NULL;--> statement-breakpoint
ALTER TABLE `rounds` ADD `ai_model_id` text;--> statement-breakpoint
CREATE INDEX `results_model_level_idx` ON `results` (`level_set_version`,`model_id`,`reached_level`);--> statement-breakpoint
CREATE TABLE `daily_plays` (
	`key` text NOT NULL,
	`day` text NOT NULL,
	`scope` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`key`, `day`, `scope`)
);
