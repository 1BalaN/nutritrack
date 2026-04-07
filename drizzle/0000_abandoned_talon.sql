CREATE TABLE `meal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`meal_type` text NOT NULL,
	`product_id` text NOT NULL,
	`grams` real NOT NULL,
	`kcal` real NOT NULL,
	`protein` real NOT NULL,
	`fat` real NOT NULL,
	`carbs` real NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`kcal_per_100g` real NOT NULL,
	`protein` real NOT NULL,
	`fat` real NOT NULL,
	`carbs` real NOT NULL,
	`barcode` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`product_id` text NOT NULL,
	`grams` real NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`servings` integer DEFAULT 1 NOT NULL,
	`total_kcal` real NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`weight` real,
	`height` real,
	`age` integer,
	`activity_level` text DEFAULT 'moderate' NOT NULL,
	`calorie_goal` integer DEFAULT 2000 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
