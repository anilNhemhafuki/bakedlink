
-- Add expired products tables
CREATE TABLE IF NOT EXISTS "expired_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"serial_number" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" varchar(200) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_id" integer NOT NULL,
	"unit_name" varchar(50) NOT NULL,
	"rate_per_unit" numeric(10, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"expiry_date" date NOT NULL,
	"is_day_closed" boolean DEFAULT false,
	"branch_id" integer,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "daily_expiry_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"summary_date" date NOT NULL,
	"total_items" integer NOT NULL,
	"total_quantity" numeric(10, 2) NOT NULL,
	"total_loss" numeric(12, 2) NOT NULL,
	"is_day_closed" boolean DEFAULT false,
	"closed_by" varchar,
	"closed_at" timestamp,
	"branch_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_expired_products_date" ON "expired_products" ("expiry_date");
CREATE INDEX IF NOT EXISTS "idx_expired_products_product" ON "expired_products" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_daily_expiry_summary_date" ON "daily_expiry_summary" ("summary_date");
