
-- Create branches table
CREATE TABLE IF NOT EXISTS "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_code" varchar(20) NOT NULL,
	"name" varchar(200) NOT NULL,
	"address" text,
	"phone" varchar(20),
	"email" varchar(100),
	"manager_name" varchar(100),
	"is_head_office" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "branches_branch_code_unique" UNIQUE("branch_code")
);

-- Add branch_id and can_access_all_branches to users table
ALTER TABLE "users" ADD COLUMN "branch_id" integer;
ALTER TABLE "users" ADD COLUMN "can_access_all_branches" boolean DEFAULT false;

-- Add branch_id to products table
ALTER TABLE "products" ADD COLUMN "branch_id" integer;
ALTER TABLE "products" ADD COLUMN "is_global" boolean DEFAULT false;

-- Add branch_id to inventory_items table
ALTER TABLE "inventory_items" ADD COLUMN "branch_id" integer;

-- Add branch_id to orders table
ALTER TABLE "orders" ADD COLUMN "branch_id" integer;

-- Add branch_id to sales table
ALTER TABLE "sales" ADD COLUMN "branch_id" integer;

-- Add branch_id to purchases table
ALTER TABLE "purchases" ADD COLUMN "branch_id" integer;

-- Add branch_id to production_schedule table
ALTER TABLE "production_schedule" ADD COLUMN "branch_id" integer;

-- Add foreign key constraints
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "products" ADD CONSTRAINT "products_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "sales" ADD CONSTRAINT "sales_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "production_schedule" ADD CONSTRAINT "production_schedule_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;

-- Insert default head office branch
INSERT INTO "branches" (branch_code, name, manager_name, is_head_office, is_active)
VALUES ('HQ001', 'Head Office', 'System Administrator', true, true)
ON CONFLICT (branch_code) DO NOTHING;

-- Update existing users to have access to all branches (for migration)
UPDATE "users" SET can_access_all_branches = true WHERE role IN ('super_admin', 'admin');
