
-- Add stock tracking fields to inventory_items table
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS inv_code VARCHAR(50) UNIQUE;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS opening_stock NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS purchased_quantity NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS consumed_quantity NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS closing_stock NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_ingredient BOOLEAN DEFAULT false;

-- Update existing records to have proper stock values
UPDATE inventory_items SET 
  opening_stock = current_stock,
  closing_stock = current_stock,
  purchased_quantity = 0,
  consumed_quantity = 0
WHERE opening_stock IS NULL OR closing_stock IS NULL;

-- Generate inventory codes for existing items if they don't have one
UPDATE inventory_items SET inv_code = 'INV-' || LPAD(id::text, 6, '0') WHERE inv_code IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_inv_code ON inventory_items(inv_code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_ingredient ON inventory_items(is_ingredient);
CREATE INDEX IF NOT EXISTS idx_inventory_items_group ON inventory_items(category_id);
