
-- Add new fields to production_schedule table
ALTER TABLE "production_schedule" ADD COLUMN IF NOT EXISTS "schedule_date" date;
ALTER TABLE "production_schedule" ADD COLUMN IF NOT EXISTS "shift" varchar(20) DEFAULT 'Morning';
ALTER TABLE "production_schedule" ADD COLUMN IF NOT EXISTS "planned_by" varchar(100);
ALTER TABLE "production_schedule" ADD COLUMN IF NOT EXISTS "approved_by" varchar(100);
ALTER TABLE "production_schedule" ADD COLUMN IF NOT EXISTS "product_code" varchar(50);
ALTER TABLE "production_schedule" ADD COLUMN IF NOT EXISTS "batch_no" varchar(50);
ALTER TABLE "production_schedule" ADD COLUMN IF NOT EXISTS "total_quantity" numeric(10, 2);
ALTER TABLE "production_schedule" ADD COLUMN IF NOT EXISTS "unit_type" varchar(50) DEFAULT 'kg';
ALTER TABLE "production_schedule" ADD COLUMN IF NOT EXISTS "actual_quantity_packets" numeric(10, 2);
ALTER TABLE "production_schedule" ADD COLUMN IF NOT EXISTS "priority" varchar(20) DEFAULT 'medium';
ALTER TABLE "production_schedule" ADD COLUMN IF NOT EXISTS "production_start_time" timestamp;
ALTER TABLE "production_schedule" ADD COLUMN IF NOT EXISTS "production_end_time" timestamp;

-- Create production history table for closed day data
CREATE TABLE IF NOT EXISTS "production_schedule_history" (
  "id" serial PRIMARY KEY,
  "original_schedule_id" integer REFERENCES "production_schedule"("id"),
  "product_id" integer NOT NULL,
  "product_name" varchar(200),
  "product_code" varchar(50),
  "batch_no" varchar(50),
  "total_quantity" numeric(10, 2),
  "unit_type" varchar(50),
  "actual_quantity_packets" numeric(10, 2),
  "priority" varchar(20),
  "production_start_time" timestamp,
  "production_end_time" timestamp,
  "assigned_to" varchar,
  "notes" text,
  "status" varchar(50),
  "schedule_date" date,
  "shift" varchar(20),
  "planned_by" varchar(100),
  "approved_by" varchar(100),
  "closed_at" timestamp DEFAULT NOW(),
  "closed_by" varchar(100),
  "created_at" timestamp DEFAULT NOW()
);
