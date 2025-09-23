
-- Add sales returns tables
CREATE TABLE IF NOT EXISTS "sales_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"serial_number" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" varchar(200) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_id" integer NOT NULL,
	"unit_name" varchar(50) NOT NULL,
	"rate_per_unit" numeric(10, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"return_date" date NOT NULL,
	"sale_id" integer,
	"customer_id" integer,
	"return_reason" varchar(100) DEFAULT 'damaged',
	"is_day_closed" boolean DEFAULT false,
	"branch_id" integer,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "daily_sales_return_summary" (
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

-- Add purchase returns tables
CREATE TABLE IF NOT EXISTS "purchase_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"serial_number" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"inventory_item_name" varchar(200) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_id" integer NOT NULL,
	"unit_name" varchar(50) NOT NULL,
	"rate_per_unit" numeric(10, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"return_date" date NOT NULL,
	"purchase_id" integer,
	"party_id" integer,
	"return_reason" varchar(100) DEFAULT 'damaged',
	"is_day_closed" boolean DEFAULT false,
	"branch_id" integer,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "daily_purchase_return_summary" (
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
CREATE INDEX IF NOT EXISTS "idx_sales_returns_date" ON "sales_returns" ("return_date");
CREATE INDEX IF NOT EXISTS "idx_sales_returns_product" ON "sales_returns" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_daily_sales_return_summary_date" ON "daily_sales_return_summary" ("summary_date");

CREATE INDEX IF NOT EXISTS "idx_purchase_returns_date" ON "purchase_returns" ("return_date");
CREATE INDEX IF NOT EXISTS "idx_purchase_returns_item" ON "purchase_returns" ("inventory_item_id");
CREATE INDEX IF NOT EXISTS "idx_daily_purchase_return_summary_date" ON "daily_purchase_return_summary" ("summary_date");

-- Drop old expired products tables if they exist
DROP TABLE IF EXISTS "expired_products";
DROP TABLE IF EXISTS "daily_expiry_summary";
