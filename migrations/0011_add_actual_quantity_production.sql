
-- Add actual_quantity column to production_schedule table
ALTER TABLE production_schedule ADD COLUMN actual_quantity NUMERIC(10, 2);
