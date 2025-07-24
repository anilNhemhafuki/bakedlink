
-- Add unit_id column to inventory_items table
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit_id INTEGER;

-- Add foreign key constraint
ALTER TABLE inventory_items ADD CONSTRAINT fk_inventory_unit 
  FOREIGN KEY (unit_id) REFERENCES units(id);

-- Update existing records to have unit_id based on unit abbreviation
UPDATE inventory_items 
SET unit_id = (
  SELECT u.id 
  FROM units u 
  WHERE u.abbreviation = inventory_items.unit 
  LIMIT 1
)
WHERE unit_id IS NULL;
