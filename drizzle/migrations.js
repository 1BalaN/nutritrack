// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo
import journal from './meta/_journal.json'

const m0000 = `CREATE TABLE \`meal_entries\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`date\` text NOT NULL,
	\`meal_type\` text NOT NULL,
	\`product_id\` text NOT NULL,
	\`grams\` real NOT NULL,
	\`kcal\` real NOT NULL,
	\`protein\` real NOT NULL,
	\`fat\` real NOT NULL,
	\`carbs\` real NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL,
	FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE \`products\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`brand\` text,
	\`kcal_per_100g\` real NOT NULL,
	\`protein\` real NOT NULL,
	\`fat\` real NOT NULL,
	\`carbs\` real NOT NULL,
	\`barcode\` text,
	\`source\` text DEFAULT 'manual' NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`recipe_ingredients\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`recipe_id\` text NOT NULL,
	\`product_id\` text NOT NULL,
	\`grams\` real NOT NULL,
	FOREIGN KEY (\`recipe_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE \`recipes\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`servings\` integer DEFAULT 1 NOT NULL,
	\`total_kcal\` real NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`user_profile\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`weight\` real,
	\`height\` real,
	\`age\` integer,
	\`activity_level\` text DEFAULT 'moderate' NOT NULL,
	\`calorie_goal\` integer DEFAULT 2000 NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);`

const m0001 = `CREATE TABLE \`pending_sync\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`entity_type\` text NOT NULL,
	\`entity_id\` text NOT NULL,
	\`operation\` text NOT NULL,
	\`payload\` text NOT NULL,
	\`retry_count\` integer DEFAULT 0 NOT NULL,
	\`created_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX \`idx_pending_sync_entity\` ON \`pending_sync\` (\`entity_type\`,\`entity_id\`);--> statement-breakpoint
CREATE INDEX \`idx_pending_sync_retry\` ON \`pending_sync\` (\`retry_count\`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE \`__new_meal_entries\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`date\` text NOT NULL,
	\`meal_type\` text NOT NULL,
	\`product_id\` text NOT NULL,
	\`recipe_id\` text,
	\`grams\` real NOT NULL,
	\`kcal\` real NOT NULL,
	\`protein\` real NOT NULL,
	\`fat\` real NOT NULL,
	\`carbs\` real NOT NULL,
	\`synced_at\` integer,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL,
	FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (\`recipe_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO \`__new_meal_entries\`("id", "date", "meal_type", "product_id", "recipe_id", "grams", "kcal", "protein", "fat", "carbs", "synced_at", "created_at", "updated_at") SELECT "id", "date", "meal_type", "product_id", "recipe_id", "grams", "kcal", "protein", "fat", "carbs", "synced_at", "created_at", "updated_at" FROM \`meal_entries\`;--> statement-breakpoint
DROP TABLE \`meal_entries\`;--> statement-breakpoint
ALTER TABLE \`__new_meal_entries\` RENAME TO \`meal_entries\`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX \`idx_meal_entries_date\` ON \`meal_entries\` (\`date\`);--> statement-breakpoint
CREATE INDEX \`idx_meal_entries_date_meal\` ON \`meal_entries\` (\`date\`,\`meal_type\`);--> statement-breakpoint
CREATE INDEX \`idx_meal_entries_product\` ON \`meal_entries\` (\`product_id\`);--> statement-breakpoint
CREATE INDEX \`idx_meal_entries_synced\` ON \`meal_entries\` (\`synced_at\`);--> statement-breakpoint
CREATE TABLE \`__new_recipe_ingredients\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`recipe_id\` text NOT NULL,
	\`product_id\` text NOT NULL,
	\`grams\` real NOT NULL,
	FOREIGN KEY (\`recipe_id\`) REFERENCES \`recipes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO \`__new_recipe_ingredients\`("id", "recipe_id", "product_id", "grams") SELECT "id", "recipe_id", "product_id", "grams" FROM \`recipe_ingredients\`;--> statement-breakpoint
DROP TABLE \`recipe_ingredients\`;--> statement-breakpoint
ALTER TABLE \`__new_recipe_ingredients\` RENAME TO \`recipe_ingredients\`;--> statement-breakpoint
CREATE INDEX \`idx_recipe_ingredients_recipe\` ON \`recipe_ingredients\` (\`recipe_id\`);--> statement-breakpoint
ALTER TABLE \`products\` ADD \`fiber\` real;--> statement-breakpoint
ALTER TABLE \`products\` ADD \`sugar\` real;--> statement-breakpoint
ALTER TABLE \`products\` ADD \`sodium\` real;--> statement-breakpoint
CREATE UNIQUE INDEX \`products_barcode_unique\` ON \`products\` (\`barcode\`);--> statement-breakpoint
CREATE INDEX \`idx_products_name\` ON \`products\` (\`name\`);--> statement-breakpoint
CREATE INDEX \`idx_products_barcode\` ON \`products\` (\`barcode\`);--> statement-breakpoint
CREATE INDEX \`idx_products_source\` ON \`products\` (\`source\`);--> statement-breakpoint
ALTER TABLE \`recipes\` ADD \`total_protein\` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE \`recipes\` ADD \`total_fat\` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE \`recipes\` ADD \`total_carbs\` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE \`recipes\` ADD \`synced_at\` integer;--> statement-breakpoint
CREATE INDEX \`idx_recipes_name\` ON \`recipes\` (\`name\`);--> statement-breakpoint
ALTER TABLE \`user_profile\` ADD \`sex\` text;--> statement-breakpoint
ALTER TABLE \`user_profile\` ADD \`protein_goal\` real;--> statement-breakpoint
ALTER TABLE \`user_profile\` ADD \`fat_goal\` real;--> statement-breakpoint
ALTER TABLE \`user_profile\` ADD \`carbs_goal\` real;`

const m0002 = `ALTER TABLE \`products\` ADD \`fatsecret_id\` text;--> statement-breakpoint
ALTER TABLE \`products\` ADD \`cached_at\` integer;`

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
  },
}
