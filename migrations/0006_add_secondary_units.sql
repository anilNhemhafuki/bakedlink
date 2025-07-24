
-- Add secondary unit fields to inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN unit_id INTEGER,
ADD COLUMN secondary_unit_id INTEGER,
ADD COLUMN conversion_rate NUMERIC(15,6) DEFAULT 1;

-- Update existing records to have unit_id based on their current unit
UPDATE inventory_items 
SET unit_id = (
  SELECT id FROM units 
  WHERE abbreviation = inventory_items.unit 
  OR name = inventory_items.unit 
  LIMIT 1
);
