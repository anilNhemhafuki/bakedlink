
CREATE TABLE IF NOT EXISTS "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"customer_id" integer,
	"customer_email" varchar(100),
	"customer_phone" varchar(20),
	"total_amount" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"sale_date" timestamp DEFAULT now(),
	"notes" text,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit" varchar(50),
	"unit_id" integer,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
