
-- Add notes field to inventory_items table
ALTER TABLE inventory_items ADD COLUMN notes TEXT;

-- Update existing records to have empty notes if null
UPDATE inventory_items SET notes = '' WHERE notes IS NULL;
