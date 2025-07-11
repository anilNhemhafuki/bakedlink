CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"current_stock" numeric(10, 2) NOT NULL,
	"min_level" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL,
	"cost_per_unit" numeric(10, 2) NOT NULL,
	"supplier" text,
	"company" text,
	"unit_id" integer,
	"default_price" numeric(10, 2) DEFAULT '0',
	"group" text,
	"opening_quantity" numeric(10, 2) DEFAULT '0',
	"opening_rate" numeric(10, 2) DEFAULT '0',
	"opening_value" numeric(10, 2) DEFAULT '0',
	"location" text,
	"notes" text,
	"date_added" timestamp DEFAULT now(),
	"last_restocked" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_name" varchar(200) NOT NULL,
	"party_id" integer,
	"total_amount" numeric(12, 2) NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"purchase_date" timestamp DEFAULT now(),
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"abbreviation" varchar(10) NOT NULL,
	"type" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "units_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "production_schedule" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "unit_id" integer;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "company" varchar(200);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "date_added" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "date_updated" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_date" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_address" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "special_instructions" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_type" varchar(50) DEFAULT 'walk_in';--> statement-breakpoint
ALTER TABLE "production_schedule" ADD COLUMN "target_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "production_schedule" ADD COLUMN "unit" varchar(20) DEFAULT 'packets';--> statement-breakpoint
ALTER TABLE "production_schedule" ADD COLUMN "target_packets" integer;--> statement-breakpoint
ALTER TABLE "production_schedule" ADD COLUMN "priority" varchar(20) DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_category_id_inventory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;