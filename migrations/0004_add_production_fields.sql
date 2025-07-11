
-- Add missing fields to production_schedule table
ALTER TABLE "production_schedule" ADD COLUMN "target_quantity" integer;
ALTER TABLE "production_schedule" ADD COLUMN "target_amount" numeric(10, 2);
ALTER TABLE "production_schedule" ADD COLUMN "unit" varchar(20) DEFAULT 'kg';
ALTER TABLE "production_schedule" ADD COLUMN "target_packets" integer;
ALTER TABLE "production_schedule" ADD COLUMN "priority" varchar(20) DEFAULT 'medium';

-- Update existing records to have default values
UPDATE "production_schedule" SET "target_quantity" = "quantity" WHERE "target_quantity" IS NULL;
UPDATE "production_schedule" SET "unit" = 'kg' WHERE "unit" IS NULL;
UPDATE "production_schedule" SET "priority" = 'medium' WHERE "priority" IS NULL;
